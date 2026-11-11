import fs from "fs";
import db from "../database/connection.js";

// =====================================================================
// Importa lugares (cafeterías, estadios, museos, hospitales, parques...) desde
// OpenStreetMap a tu tabla Lugar, usando la API Overpass.
//
// Uso (desde la carpeta Backend, donde está tu .env):
//   node scripts/importarLugares.js --estado MX-NLE
//   node scripts/importarLugares.js --estado MX-NLE --bbox 25.64,-100.36,25.72,-100.27   (solo una zona, para probar)
//   node scripts/importarLugares.js --estado MX-NLE --grupos cultura,salud
//   node scripts/importarLugares.js --estado MX-NLE --dry-run                            (no guarda nada, solo cuenta)
//   node scripts/importarLugares.js --estado MX-NLE --archivo respuesta.json             (usa un JSON de Overpass ya descargado)
//
// Es seguro correrlo varias veces: cada lugar se identifica por Fuente + idExterno
// (ej. 'osm' + 'way/123'), así que se actualiza en vez de duplicarse.
//
// Variables opcionales (.env):
//   OVERPASS_CONTACTO  tu correo/sitio, para identificarte ante el servidor (recomendado)
//   OVERPASS_URL       otra instancia de Overpass
//
// Datos © OpenStreetMap contributors (licencia ODbL). Hay que mostrar esa atribución en el mapa.
// =====================================================================

const OVERPASS_URL = process.env.OVERPASS_URL || "https://overpass-api.de/api/interpreter";
const USER_AGENT = `ChatWithChat-importador/1.0 (${process.env.OVERPASS_CONTACTO || "sin-contacto"})`;

// El servidor de Overpass es un servicio comunitario gratuito: se le pide poco y con pausas.
const PAUSA_ENTRE_CONSULTAS_MS = Number(process.env.OVERPASS_PAUSA_MS ?? 10000);
const REINTENTO_BASE_MS = Number(process.env.OVERPASS_REINTENTO_MS ?? 20000);
const MAX_INTENTOS = 4;
const TIMEOUT_QL_SEGUNDOS = 180;
const TAMANO_LOTE = 500;

// ---------------------------------------------------------------------
// Qué etiquetas de OpenStreetMap corresponden a cada categoría de tu tabla Categoria.
// El ORDEN importa: si un lugar encaja en varias (ej. un museo que además es "histórico"),
// gana la primera de esta lista. Para agregar una categoría nueva: inserta la fila en
// Categoria y agrega aquí su Clave con sus etiquetas.
// ---------------------------------------------------------------------
const CATEGORIAS_OSM = [
    { clave: "estadio",          filtros: [["leisure", ["stadium"]], ["building", ["stadium"]]] },
    { clave: "sala_conciertos",  filtros: [["amenity", ["music_venue"]]] },
    { clave: "museo",            filtros: [["tourism", ["museum"]]] },
    { clave: "historico",        filtros: [["historic", ["monument", "castle", "fort", "ruins", "archaeological_site", "manor", "city_gate"]]] },
    { clave: "turistico",        filtros: [["tourism", ["attraction", "viewpoint", "zoo", "theme_park", "aquarium"]]] },
    { clave: "hospital",         filtros: [["amenity", ["hospital"]]] },
    { clave: "teatro",           filtros: [["amenity", ["theatre", "arts_centre"]], ["tourism", ["gallery"]]] },
    { clave: "centro_comercial", filtros: [["shop", ["mall"]]] },
    { clave: "parque",           filtros: [["leisure", ["park", "garden", "nature_reserve"]]] },
    { clave: "cine",             filtros: [["amenity", ["cinema"]]] },
    { clave: "bar",              filtros: [["amenity", ["bar", "pub", "nightclub"]]] },
    { clave: "restaurante",      filtros: [["amenity", ["restaurant"]]] },
    { clave: "cafeteria",        filtros: [["amenity", ["cafe"]]] },
];

// ---------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, result) => (err ? reject(err) : resolve(result)));
    });
}

// Escapa un texto para meterlo entre comillas dentro de una consulta Overpass QL
const esc = (texto) => String(texto).replace(/\\/g, "\\\\").replace(/"/g, '\\"');

function leerArgumentos(argv) {
    const args = { estado: null, grupos: null, bbox: null, dryRun: false, archivo: null };

    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--dry-run") args.dryRun = true;
        else if (a === "--estado") args.estado = argv[++i];
        else if (a === "--grupos") args.grupos = (argv[++i] || "").split(",").map((g) => g.trim()).filter(Boolean);
        else if (a === "--archivo") args.archivo = argv[++i];
        else if (a === "--bbox") {
            const n = (argv[++i] || "").split(",").map(Number);
            if (n.length !== 4 || n.some((x) => !Number.isFinite(x)) || n[0] >= n[2] || n[1] >= n[3]) {
                throw new Error("--bbox debe ser: minLat,minLng,maxLat,maxLng (ej. 25.64,-100.36,25.72,-100.27)");
            }
            args.bbox = n;
        } else {
            throw new Error(`Argumento desconocido: ${a}`);
        }
    }

    if (!args.estado) {
        throw new Error("Falta --estado con el código ISO del estado (ej. --estado MX-NLE). Los códigos están en la tabla Estado.");
    }
    return args;
}

// ---------------------------------------------------------------------
// Overpass
// ---------------------------------------------------------------------

// Manda una consulta. Reintenta si el servidor está ocupado (429/502/503/504), si la consulta
// se pasó de tiempo, o si falló la red.
async function consultarOverpass(consulta) {
    let ultimoError;

    for (let intento = 0; intento < MAX_INTENTOS; intento++) {
        try {
            const respuesta = await fetch(OVERPASS_URL, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT },
                body: new URLSearchParams({ data: consulta }),
                signal: AbortSignal.timeout((TIMEOUT_QL_SEGUNDOS + 60) * 1000),
            });

            if ([429, 502, 503, 504].includes(respuesta.status)) {
                throw new Error(`Overpass respondió ${respuesta.status} (ocupado)`);
            }
            if (!respuesta.ok) {
                // Una consulta mal escrita no se arregla reintentando
                const texto = (await respuesta.text()).slice(0, 300);
                const error = new Error(`Overpass respondió ${respuesta.status}: ${texto}`);
                error.noReintentar = true;
                throw error;
            }

            const datos = await respuesta.json();

            // Overpass a veces responde 200 pero con un "remark" diciendo que se quedó sin tiempo
            // o memoria, y entrega datos INCOMPLETOS. Eso no se debe guardar como si fuera todo.
            if (datos.remark && /runtime error|timed out|out of memory/i.test(datos.remark)) {
                throw new Error(`Overpass no terminó la consulta: ${datos.remark}`);
            }

            return datos;
        } catch (err) {
            ultimoError = err;
            if (err.noReintentar || intento === MAX_INTENTOS - 1) break;

            const espera = REINTENTO_BASE_MS * 2 ** intento;
            console.log(`   ⚠ ${err.message}. Reintento ${intento + 1}/${MAX_INTENTOS - 1} en ${Math.round(espera / 1000)} s...`);
            await dormir(espera);
        }
    }

    throw ultimoError;
}

// Averigua cómo pedirle a Overpass "todo lo que está dentro de este estado".
// Prueba por código ISO y, si no, por nombre. Si encuentra más de una coincidencia NO adivina.
async function resolverArea(estado) {
    const intentos = [
        { por: "código ISO 3166-2", ql: `area["ISO3166-2"="${esc(estado.CodigoISO)}"]["admin_level"="4"]` },
        { por: "nombre", ql: `area["name"="${esc(estado.Nombre)}"]["admin_level"="4"]["boundary"="administrative"]` },
    ];

    for (const intento of intentos) {
        const datos = await consultarOverpass(`[out:json][timeout:60];\n${intento.ql};\nout ids;`);
        const encontradas = datos.elements?.length ?? 0;

        if (encontradas === 1) {
            console.log(`   Área de ${estado.Nombre} encontrada por ${intento.por}.`);
            return { definicion: `${intento.ql}->.zona;`, espacial: "(area.zona)" };
        }
        if (encontradas > 1) {
            throw new Error(`Encontré ${encontradas} áreas para "${estado.Nombre}" (por ${intento.por}) y no quiero adivinar cuál es. Usa --bbox para limitar la zona.`);
        }
        await dormir(PAUSA_ENTRE_CONSULTAS_MS);
    }

    throw new Error(`No encontré el área de "${estado.Nombre}" (${estado.CodigoISO}) en OpenStreetMap. Revisa Estado.CodigoISO o usa --bbox.`);
}

// Arma la consulta Overpass QL de un grupo de categorías.
function construirConsulta(zona, categorias) {
    const lineas = [];

    for (const categoria of categorias) {
        for (const [clave, valores] of categoria.filtros) {
            const filtro = valores.length === 1
                ? `["${clave}"="${valores[0]}"]`
                : `["${clave}"~"^(${valores.join("|")})$"]`;
            lineas.push(`  nwr${filtro}${zona.espacial};`);
        }
    }

    // "out center tags": para caminos y relaciones (estadios, parques) devuelve un punto central
    // en vez de todo el contorno, que es lo que necesita un marcador.
    return `[out:json][timeout:${TIMEOUT_QL_SEGUNDOS}];\n${zona.definicion}\n(\n${lineas.join("\n")}\n);\nout center tags;`;
}

// ---------------------------------------------------------------------
// De elemento de OpenStreetMap a fila de Lugar
// ---------------------------------------------------------------------

function clasificar(tags) {
    for (const categoria of CATEGORIAS_OSM) {
        for (const [clave, valores] of categoria.filtros) {
            if (valores.includes(tags[clave])) return categoria.clave;
        }
    }
    return null;
}

// Solo se aceptan enlaces http(s) (nada de "javascript:" y similares)
function urlSegura(valor, { soloHttps = false } = {}) {
    if (!valor) return null;
    let texto = String(valor).trim();
    if (!/^[a-z][a-z0-9+.-]*:/i.test(texto)) texto = `https://${texto}`;

    try {
        const url = new URL(texto);
        const permitido = soloHttps ? url.protocol === "https:" : ["http:", "https:"].includes(url.protocol);
        return permitido ? url.href.slice(0, 500) : null;
    } catch {
        return null;
    }
}

function armarFoto(tags) {
    const imagen = urlSegura(tags.image, { soloHttps: true });
    if (imagen) return imagen;

    // Muchos lugares famosos traen la foto como archivo de Wikimedia Commons
    const commons = tags.wikimedia_commons;
    if (typeof commons === "string" && commons.startsWith("File:")) {
        const archivo = commons.slice(5).trim();
        if (archivo) return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(archivo)}?width=600`;
    }
    return null;
}

function armarDireccion(tags) {
    const calle = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
    const partes = [calle, tags["addr:suburb"], tags["addr:city"]].filter(Boolean);
    return partes.length ? partes.join(", ").slice(0, 255) : null;
}

// Regresa null si el elemento no sirve (sin nombre, sin coordenadas o sin categoría)
function elementoALugar(el) {
    const tags = el.tags || {};

    const nombre = (tags.name || tags["name:es"] || "").trim();
    if (!nombre) return { descartado: "sin nombre" };

    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return { descartado: "sin coordenadas" };

    const clave = clasificar(tags);
    if (!clave) return { descartado: "sin categoría" };

    return {
        lugar: {
            idExterno: `${el.type}/${el.id}`,
            clave,
            nombre: nombre.slice(0, 150),
            descripcion: (tags["description:es"] || tags.description || "").trim().slice(0, 500) || null,
            direccion: armarDireccion(tags),
            lat: Number(lat.toFixed(6)),
            lon: Number(lon.toFixed(6)),
            foto: armarFoto(tags),
            sitioWeb: urlSegura(tags.website || tags["contact:website"])?.slice(0, 255) ?? null,
            telefono: (tags.phone || tags["contact:phone"] || "").trim().slice(0, 40) || null,
            horario: (tags.opening_hours || "").trim().slice(0, 255) || null,
        },
    };
}

// ---------------------------------------------------------------------
// Guardado
// ---------------------------------------------------------------------

const SQL_UPSERT = `
    INSERT INTO Lugar
        (Nombre, Descripcion, Direccion, Latitud, Longitud, Foto, SitioWeb, Telefono, Horario,
         id_Estado, id_Categoria, Fuente, idExterno, Activo, FechaActualizacion)
    VALUES ?
    ON DUPLICATE KEY UPDATE
        Nombre = VALUES(Nombre), Descripcion = VALUES(Descripcion), Direccion = VALUES(Direccion),
        Latitud = VALUES(Latitud), Longitud = VALUES(Longitud), Foto = VALUES(Foto),
        SitioWeb = VALUES(SitioWeb), Telefono = VALUES(Telefono), Horario = VALUES(Horario),
        id_Estado = VALUES(id_Estado), id_Categoria = VALUES(id_Categoria),
        Activo = 1, FechaActualizacion = VALUES(FechaActualizacion)`;

async function guardarLugares(lugares, { estado, idsCategoria, inicio }) {
    for (let i = 0; i < lugares.length; i += TAMANO_LOTE) {
        const filas = lugares.slice(i, i + TAMANO_LOTE).map((l) => [
            l.nombre, l.descripcion, l.direccion, l.lat, l.lon, l.foto, l.sitioWeb, l.telefono, l.horario,
            estado.ID_Estado, idsCategoria[l.clave], "osm", l.idExterno, 1, inicio,
        ]);
        await query(SQL_UPSERT, [filas]);
    }
}

// ---------------------------------------------------------------------
// Programa principal
// ---------------------------------------------------------------------

async function main() {
    const args = leerArgumentos(process.argv);
    const inicio = new Date();

    // --- Estado ---
    const [estado] = await query("SELECT ID_Estado, Nombre, CodigoISO FROM Estado WHERE CodigoISO = ?", [args.estado]);
    if (!estado) throw new Error(`No existe el estado ${args.estado} en la tabla Estado.`);

    // --- Categorías (el código y la tabla deben coincidir) ---
    const filasCategoria = await query("SELECT ID_Categoria, Clave, Grupo FROM Categoria");
    const categoriaDeClave = Object.fromEntries(filasCategoria.map((c) => [c.Clave, c]));
    const faltan = CATEGORIAS_OSM.filter((c) => !categoriaDeClave[c.clave]).map((c) => c.clave);
    if (faltan.length) {
        throw new Error(`Faltan estas categorías en la tabla Categoria (¿corriste Lugares.sql?): ${faltan.join(", ")}`);
    }

    const gruposDisponibles = [...new Set(CATEGORIAS_OSM.map((c) => categoriaDeClave[c.clave].Grupo))];
    const gruposElegidos = args.grupos ?? gruposDisponibles;
    const desconocidos = gruposElegidos.filter((g) => !gruposDisponibles.includes(g));
    if (desconocidos.length) {
        throw new Error(`Grupo(s) desconocido(s): ${desconocidos.join(", ")}. Disponibles: ${gruposDisponibles.join(", ")}`);
    }

    const categoriasElegidas = CATEGORIAS_OSM.filter((c) => gruposElegidos.includes(categoriaDeClave[c.clave].Grupo));
    const idsCategoria = Object.fromEntries(CATEGORIAS_OSM.map((c) => [c.clave, categoriaDeClave[c.clave].ID_Categoria]));

    console.log(`Importando lugares de ${estado.Nombre} (${estado.CodigoISO})${args.dryRun ? "  [DRY-RUN: no se guarda nada]" : ""}`);
    console.log(`Grupos: ${gruposElegidos.join(", ")}${args.bbox ? `  | zona: ${args.bbox.join(",")}` : ""}`);

    // Lo que ya existe, para poder decir cuántos son nuevos
    const existentes = new Set(
        (await query("SELECT idExterno FROM Lugar WHERE Fuente = 'osm'")).map((f) => f.idExterno)
    );

    const vistos = new Map();                       // idExterno -> lugar (sin repetidos entre grupos)
    const descartados = {};
    let hubieronFallas = false;
    let nuevos = 0;

    // Procesa un lote de elementos (de Overpass o de un archivo)
    const procesar = (elementos) => {
        const delLote = [];
        for (const el of elementos) {
            const { lugar, descartado } = elementoALugar(el);
            if (descartado) {
                descartados[descartado] = (descartados[descartado] || 0) + 1;
                continue;
            }
            if (!vistos.has(lugar.idExterno)) {
                vistos.set(lugar.idExterno, lugar);
                delLote.push(lugar);
                if (!existentes.has(lugar.idExterno)) nuevos++;
            }
        }
        return delLote;
    };

    // Solo se guardan los lugares de las categorías elegidas
    const delGrupoElegido = (lugares) => lugares.filter((l) => categoriasElegidas.some((c) => c.clave === l.clave));
    const contexto = { estado, idsCategoria, inicio };

    if (args.archivo) {
        // --- Modo archivo: no se toca la red ---
        const datos = JSON.parse(fs.readFileSync(args.archivo, "utf8"));
        const lote = delGrupoElegido(procesar(datos.elements || []));
        console.log(`Archivo: ${datos.elements?.length ?? 0} elementos, ${lote.length} lugares válidos.`);
        if (!args.dryRun) await guardarLugares(lote, contexto);
        hubieronFallas = true;     // con un archivo no se puede saber si está completo: no se desactiva nada
    } else {
        // --- Modo normal: Overpass ---
        const zona = args.bbox
            ? { definicion: "", espacial: `(${args.bbox.join(",")})` }
            : await resolverArea(estado);

        // Un grupo a la vez (consultas más chicas = menos riesgo de que Overpass se pase de tiempo)
        for (const grupo of gruposElegidos) {
            const categoriasDelGrupo = categoriasElegidas.filter((c) => categoriaDeClave[c.clave].Grupo === grupo);
            console.log(`[${grupo}] consultando Overpass (${categoriasDelGrupo.map((c) => c.clave).join(", ")})...`);

            try {
                const datos = await consultarOverpass(construirConsulta(zona, categoriasDelGrupo));
                const lote = delGrupoElegido(procesar(datos.elements || []));
                console.log(`   ${datos.elements?.length ?? 0} elementos, ${lote.length} lugares nuevos para esta corrida.`);

                // Se guarda grupo por grupo: si algo falla más adelante, lo ya descargado no se pierde
                if (!args.dryRun) await guardarLugares(lote, contexto);
            } catch (err) {
                hubieronFallas = true;
                console.error(`   ✗ El grupo "${grupo}" falló: ${err.message}`);
            }

            await dormir(PAUSA_ENTRE_CONSULTAS_MS);
        }
    }

    // --- Desactivar lo que ya no aparece ---
    // Solo si TODO salió bien (si falló algo, "no apareció" no significa "ya no existe").
    let desactivados = 0;
    if (!args.dryRun && !hubieronFallas) {
        const ids = categoriasElegidas.map((c) => idsCategoria[c.clave]);
        const condicionZona = args.bbox ? "AND Latitud BETWEEN ? AND ? AND Longitud BETWEEN ? AND ?" : "";
        const paramsZona = args.bbox ? [args.bbox[0], args.bbox[2], args.bbox[1], args.bbox[3]] : [];

        const r = await query(
            `UPDATE Lugar SET Activo = 0
             WHERE Fuente = 'osm' AND Activo = 1 AND id_Estado = ? AND id_Categoria IN (?)
               AND FechaActualizacion < ? ${condicionZona}`,
            [estado.ID_Estado, ids, inicio, ...paramsZona]
        );
        desactivados = r.affectedRows;
    }

    // --- Resumen ---
    const porCategoria = {};
    for (const l of vistos.values()) porCategoria[l.clave] = (porCategoria[l.clave] || 0) + 1;

    console.log("\n========== RESUMEN ==========");
    console.log(`Lugares válidos encontrados: ${vistos.size}  (nuevos: ${nuevos}, ya existían: ${vistos.size - nuevos})`);
    console.log("Por categoría:", porCategoria);
    console.log("Descartados:", Object.keys(descartados).length ? descartados : "ninguno");
    if (args.dryRun) console.log("DRY-RUN: no se escribió nada en la base de datos.");
    else if (hubieronFallas) console.log("No se desactivó ningún lugar porque la importación no fue completa (o fue desde archivo).");
    else console.log(`Desactivados (ya no aparecen en OpenStreetMap): ${desactivados}`);

    return hubieronFallas && !args.archivo ? 1 : 0;
}

main()
    .then((codigo) => { db.end(); process.exit(codigo); })
    .catch((err) => {
        console.error(`\n✗ ${err.message}`);
        db.end();
        process.exit(1);
    });