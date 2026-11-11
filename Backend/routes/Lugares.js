import express from "express";
import db from "../database/connection.js";

const router = express.Router();

// db.query trabaja con callbacks; esto lo vuelve una promesa
function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, result) => (err ? reject(err) : resolve(result)));
    });
}

const LIMITE_POR_DEFECTO = 200;
const LIMITE_MAXIMO = 500;
const MAX_GRADOS = 10;          // zona máxima que se deja pedir (evita pedir "todo el país" de golpe)

// Fila de la DB -> objeto para el front.
// OJO: el driver devuelve las columnas DECIMAL (Latitud/Longitud) como TEXTO ('25.690812'),
// por eso el Number().
const filaALugar = (f) => ({
    id: f.ID_Lugar,
    nombre: f.Nombre,
    descripcion: f.Descripcion,
    direccion: f.Direccion,
    lat: Number(f.Latitud),
    lng: Number(f.Longitud),
    foto: f.Foto,
    sitioWeb: f.SitioWeb,
    telefono: f.Telefono,
    horario: f.Horario,
    categoria: {
        id: f.ID_Categoria,
        clave: f.Clave,
        nombre: f.CategoriaNombre,
        grupo: f.Grupo,
        color: f.Color,
    },
});

const COLUMNAS = `
    l.ID_Lugar, l.Nombre, l.Descripcion, l.Direccion, l.Latitud, l.Longitud,
    l.Foto, l.SitioWeb, l.Telefono, l.Horario,
    c.ID_Categoria, c.Clave, c.Nombre AS CategoriaNombre, c.Grupo, c.Color`;

// ---------------------------------------------------------------------
// Categorías (para armar los filtros del mapa)
// ---------------------------------------------------------------------
router.get("/categorias", async (req, res) => {
    try {
        const filas = await query(
            "SELECT ID_Categoria, Clave, Nombre, Grupo, Color, Prioridad FROM Categoria ORDER BY Prioridad, Nombre"
        );

        res.set("Cache-Control", "public, max-age=300");
        res.status(200).json({
            success: true,
            categorias: filas.map((c) => ({
                id: c.ID_Categoria, clave: c.Clave, nombre: c.Nombre,
                grupo: c.Grupo, color: c.Color, prioridad: c.Prioridad,
            })),
        });
    } catch (err) {
        console.error("Error al leer categorías:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ---------------------------------------------------------------------
// Lugares dentro de la zona visible del mapa
//   ?minLat=&maxLat=&minLng=&maxLng=      (obligatorios)
//   &grupos=comida,cultura                (opcional: filtra por grupo)
//   &limite=200                           (opcional, máx. 500)
// Los más importantes primero (Categoria.Prioridad), y entre iguales los que traen foto/sitio web.
// "truncado: true" significa que había más lugares de los que se devolvieron (hay que acercar el mapa).
// ---------------------------------------------------------------------
router.get("/lugares", async (req, res) => {
    const { minLat, maxLat, minLng, maxLng } = Object.fromEntries(
        ["minLat", "maxLat", "minLng", "maxLng"].map((k) => [k, req.query[k] === undefined || req.query[k] === "" ? NaN : Number(req.query[k])])
    );

    if ([minLat, maxLat, minLng, maxLng].some((n) => !Number.isFinite(n))) {
        return res.status(400).json({ success: false, error: "Faltan minLat, maxLat, minLng y maxLng (números)" });
    }
    if (minLat < -90 || maxLat > 90 || minLng < -180 || maxLng > 180 || minLat >= maxLat || minLng >= maxLng) {
        return res.status(400).json({ success: false, error: "La zona no es válida" });
    }
    if (maxLat - minLat > MAX_GRADOS || maxLng - minLng > MAX_GRADOS) {
        return res.status(400).json({ success: false, error: "La zona es muy grande, acerca el mapa" });
    }

    // grupos: solo letras minúsculas y "_" (así nada raro llega a la consulta)
    let grupos = [];
    if (req.query.grupos) {
        grupos = String(req.query.grupos).split(",").map((g) => g.trim()).filter(Boolean);
        if (grupos.length > 10 || grupos.some((g) => !/^[a-z_]{1,30}$/.test(g))) {
            return res.status(400).json({ success: false, error: "grupos no es válido" });
        }
    }

    const pedido = parseInt(req.query.limite, 10);
    const limite = Math.min(Math.max(Number.isFinite(pedido) ? pedido : LIMITE_POR_DEFECTO, 1), LIMITE_MAXIMO);

    try {
        const filas = await query(
            `SELECT ${COLUMNAS}
             FROM Lugar l
             JOIN Categoria c ON c.ID_Categoria = l.id_Categoria
             WHERE l.Activo = 1
               AND l.Latitud BETWEEN ? AND ?
               AND l.Longitud BETWEEN ? AND ?
               ${grupos.length ? "AND c.Grupo IN (?)" : ""}
             ORDER BY c.Prioridad ASC, (l.Foto IS NOT NULL) DESC, (l.SitioWeb IS NOT NULL) DESC, l.ID_Lugar ASC
             LIMIT ${limite + 1}`,                      // pido 1 de más para saber si quedaron lugares fuera
            grupos.length ? [minLat, maxLat, minLng, maxLng, grupos] : [minLat, maxLat, minLng, maxLng]
        );

        res.status(200).json({
            success: true,
            truncado: filas.length > limite,
            lugares: filas.slice(0, limite).map(filaALugar),
        });
    } catch (err) {
        console.error("Error al leer lugares:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ---------------------------------------------------------------------
// Un lugar
// ---------------------------------------------------------------------
router.get("/lugares/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ success: false, error: "id no válido" });
    }

    try {
        const filas = await query(
            `SELECT ${COLUMNAS}
             FROM Lugar l JOIN Categoria c ON c.ID_Categoria = l.id_Categoria
             WHERE l.ID_Lugar = ? AND l.Activo = 1`,
            [id]
        );

        if (!filas.length) return res.status(404).json({ success: false, error: "Lugar no encontrado" });
        res.status(200).json({ success: true, lugar: filaALugar(filas[0]) });
    } catch (err) {
        console.error("Error al leer el lugar:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;