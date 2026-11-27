import express from 'express';
import multer from 'multer';
import db from '../database/connection.js';
import { urlPublica } from '../utils/urlPublica.js';
import { guardarImagen, borrarImagen } from '../utils/imagenes.js';
import { obtenerAjustes } from './Ajustes.js';

const router = express.Router();

const query = (sql, params = []) => new Promise((resolve, reject) =>
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows))));

const httpError = (status, message) => Object.assign(new Error(message), { status });

// Imagen del itinerario: ya llega recortada y comprimida desde el front (~50-150 KB)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } }).single('foto');
const subir = (req, res) => new Promise((ok, fail) => upload(req, res, (e) => (e ? fail(e) : ok())));

// Envuelve cada ruta para responder siempre en JSON, con el código HTTP correcto
const ruta = (fn) => async (req, res) => {
    try {
        await fn(req, res);
    } catch (err) {
        if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, error: 'La imagen pesa más de 2 MB' });
        if (err.code === 'ER_NO_REFERENCED_ROW_2') return res.status(404).json({ success: false, error: 'Lugar o usuario no encontrado' });
        if (!err.status) console.error('Error en itinerarios:', err);
        res.status(err.status || 500).json({ success: false, error: err.status ? err.message : 'Error del servidor' });
    }
};

const idUsuarioDe = (req) => Number(req.body?.idUsuario ?? req.query.idUsuario);

async function cargarItinerario(idItinerario) {
    const rows = await query('SELECT ID_Itinerario, id_Usuario, Nombre, Imagen, Completado FROM Itinerario WHERE ID_Itinerario = ?', [idItinerario]);
    if (rows.length === 0) throw httpError(404, 'Itinerario no encontrado');
    return rows[0];
}

const esIntegrante = async (idItinerario, idUsuario) => {
    const rows = await query('SELECT 1 AS ok FROM Itinerario_Integrante WHERE id_Itinerario = ? AND id_Usuario = ?', [idItinerario, idUsuario]);
    return rows.length > 0;
};

// Quien modifica tiene que ser integrante del itinerario (el dueño siempre lo es).
// Devuelve el itinerario + esDuenio. Cambiar nombre/foto y eliminar el itinerario es solo del dueño.
// OJO: el idUsuario viaja en el body/query (todavía no hay JWT, igual que en el resto de tu API).
async function exigirIntegrante(idItinerario, idUsuario) {
    if (!idItinerario || !idUsuario) throw httpError(400, 'Faltan datos');

    const it = await cargarItinerario(idItinerario);
    const esDuenio = Number(it.id_Usuario) === idUsuario;

    if (!esDuenio && !(await esIntegrante(idItinerario, idUsuario))) {
        throw httpError(403, 'No eres integrante de este itinerario');
    }
    return { ...it, esDuenio };
}

// Apunta en el historial qué se hizo (de ahí sale el "Usuario X agregó una parada").
// Si falla no tumba la acción principal.
const registrar = async (idItinerario, idUsuario, accion) => {
    try {
        await query('INSERT INTO Itinerario_Log (id_Itinerario, id_Usuario, Accion) VALUES (?, ?, ?)', [idItinerario, idUsuario, accion]);
    } catch (err) {
        console.error('No se pudo registrar el cambio del itinerario (¿corriste integrantes.sql?):', err.message);
    }
};

// ---------- Lista de MIS itinerarios (los míos y a los que me uní) ----------
router.get('/Itinerarios/Usuario/:id', ruta(async (req, res) => {
    const idUsuario = Number(req.params.id);

    const rows = await query(
        `SELECT i.ID_Itinerario, i.Nombre, i.Imagen, i.Completado, i.id_Usuario AS Duenio,
                (SELECT COUNT(*) FROM Itinerario_Parada p WHERE p.id_Itinerario = i.ID_Itinerario) AS Total,
                1 + (SELECT COUNT(*) FROM Itinerario_Integrante m
                     WHERE m.id_Itinerario = i.ID_Itinerario AND m.id_Usuario <> i.id_Usuario) AS Integrantes
         FROM Itinerario i
         WHERE i.id_Usuario = ?
            OR EXISTS (SELECT 1 FROM Itinerario_Integrante x WHERE x.id_Itinerario = i.ID_Itinerario AND x.id_Usuario = ?)
         ORDER BY i.F_Creacion DESC, i.ID_Itinerario DESC`,
        [idUsuario, idUsuario]
    );

    res.json({
        success: true,
        itinerarios: rows.map(r => ({
            id: r.ID_Itinerario,
            nombre: r.Nombre,
            foto: urlPublica(r.Imagen, req),
            completado: !!r.Completado,
            totalParadas: r.Total,
            totalIntegrantes: Number(r.Integrantes),
            idUsuario: r.Duenio,
            esDuenio: Number(r.Duenio) === idUsuario,
        })),
    });
}));

// ---------- Cuántos itinerarios COMPLETADOS tiene un usuario (los suyos y a los que se unió) ----------
// De aquí salen las insignias del perfil.
router.get('/Itinerarios/Completados/:id', ruta(async (req, res) => {
    const idUsuario = Number(req.params.id);
    if (!idUsuario) throw httpError(400, 'Faltan datos');

    // ?viewer=<mi id>: si el dueño apagó "Mostrar Insigneas", los demás no ven su progreso
    if (Number(req.query.viewer) !== idUsuario && !(await obtenerAjustes(idUsuario)).mostrarInsignias) {
        return res.json({ success: true, oculto: true, total: 0 });
    }

    const [fila] = await query(
        `SELECT COUNT(*) AS Total
         FROM Itinerario i
         WHERE i.Completado = 1
           AND (i.id_Usuario = ?
                OR EXISTS (SELECT 1 FROM Itinerario_Integrante x WHERE x.id_Itinerario = i.ID_Itinerario AND x.id_Usuario = ?))`,
        [idUsuario, idUsuario]
    );

    res.json({ success: true, total: Number(fila.Total) });
}));

// ---------- Marcar / desmarcar como COMPLETADO ----------
// body: { idUsuario, completado: true|false }. Puede cualquier integrante, y cuenta para todos los integrantes.
router.put('/Itinerarios/:id/Completado', ruta(async (req, res) => {
    const idItinerario = Number(req.params.id);
    const idUsuario = idUsuarioDe(req);
    await exigirIntegrante(idItinerario, idUsuario);

    const completado = req.body.completado === true || req.body.completado === 1 || req.body.completado === '1' || req.body.completado === 'true';

    const r = await query('UPDATE Itinerario SET Completado = ? WHERE ID_Itinerario = ?', [completado ? 1 : 0, idItinerario]);
    if (r.changedRows > 0) {
        await registrar(idItinerario, idUsuario, completado ? 'marcó el itinerario como completado' : 'marcó el itinerario como pendiente');
    }

    res.json({ success: true, completado });
}));

// ---------- Crear itinerario ----------
router.post('/Itinerarios', ruta(async (req, res) => {
    const idUsuario = idUsuarioDe(req);
    const nombre = String(req.body.nombre ?? 'Nuevo Itinerario').trim().slice(0, 100) || 'Nuevo Itinerario';
    if (!idUsuario) throw httpError(400, 'Faltan datos');

    const r = await query('INSERT INTO Itinerario (id_Usuario, Nombre) VALUES (?, ?)', [idUsuario, nombre]);
    await query('INSERT IGNORE INTO Itinerario_Integrante (id_Itinerario, id_Usuario) VALUES (?, ?)', [r.insertId, idUsuario]);
    await registrar(r.insertId, idUsuario, 'creó el itinerario');

    res.status(201).json({
        success: true,
        itinerario: {
            id: r.insertId, nombre, foto: null, completado: false, totalParadas: 0,
            totalIntegrantes: 1, idUsuario, esDuenio: true,
        },
    });
}));

// ---------- "Eliminar" un itinerario de mi lista ----------
//  - Si soy el dueño: se elimina para todos (paradas e integrantes se borran solos por el CASCADE).
//  - Si soy integrante: solo salgo del itinerario, a los demás les sigue existiendo.
router.delete('/Itinerarios/:id', ruta(async (req, res) => {
    const idItinerario = Number(req.params.id);
    const idUsuario = idUsuarioDe(req);
    const it = await exigirIntegrante(idItinerario, idUsuario);

    if (it.esDuenio) {
        await query('DELETE FROM Itinerario WHERE ID_Itinerario = ?', [idItinerario]);
        await borrarImagen(it.Imagen);
        return res.json({ success: true, accion: 'eliminado' });
    }

    await query('DELETE FROM Itinerario_Integrante WHERE id_Itinerario = ? AND id_Usuario = ?', [idItinerario, idUsuario]);
    await registrar(idItinerario, idUsuario, 'salió del itinerario');
    res.json({ success: true, accion: 'salio' });
}));

// ---------- Resumen para la tarjeta del chat: nombre/foto ACTUALES + ¿ya soy integrante? ----------
// GET /Itinerarios/:id/Resumen?viewer=<mi id>
router.get('/Itinerarios/:id/Resumen', ruta(async (req, res) => {
    const [it] = await query(
        `SELECT i.ID_Itinerario, i.id_Usuario, i.Nombre, i.Imagen,
                1 + (SELECT COUNT(*) FROM Itinerario_Integrante m
                     WHERE m.id_Itinerario = i.ID_Itinerario AND m.id_Usuario <> i.id_Usuario) AS Integrantes
         FROM Itinerario i WHERE i.ID_Itinerario = ?`,
        [req.params.id]
    );

    // Si ya lo eliminaron, la tarjeta del chat solo avisa que no está disponible
    if (!it) return res.json({ success: true, existe: false });

    const viewer = Number(req.query.viewer);
    const soyIntegrante = !!viewer && (Number(it.id_Usuario) === viewer || await esIntegrante(it.ID_Itinerario, viewer));

    res.json({
        success: true,
        existe: true,
        esIntegrante: soyIntegrante,
        itinerario: { id: it.ID_Itinerario, nombre: it.Nombre, foto: urlPublica(it.Imagen, req), totalIntegrantes: Number(it.Integrantes) },
    });
}));

// ---------- "+ Unirse" (desde el mensaje del chat) ----------
// body: { idUsuario }. Si ya soy integrante no hace nada (no se puede agregar 2 veces).
router.post('/Itinerarios/:id/Unirse', ruta(async (req, res) => {
    const idItinerario = Number(req.params.id);
    const idUsuario = idUsuarioDe(req);
    if (!idItinerario || !idUsuario) throw httpError(400, 'Faltan datos');

    const it = await cargarItinerario(idItinerario);
    let yaEra = Number(it.id_Usuario) === idUsuario;

    if (!yaEra) {
        // ON DUPLICATE KEY (y no INSERT IGNORE) para que un usuario inexistente SÍ marque error
        const r = await query(
            `INSERT INTO Itinerario_Integrante (id_Itinerario, id_Usuario) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE id_Itinerario = id_Itinerario`,
            [idItinerario, idUsuario]
        );
        yaEra = r.affectedRows === 0;
        if (!yaEra) await registrar(idItinerario, idUsuario, 'se unió al itinerario');
    }

    res.json({ success: true, yaEra, itinerario: { id: idItinerario, nombre: it.Nombre, foto: urlPublica(it.Imagen, req) } });
}));

// ---------- Un itinerario con sus paradas, integrantes y el último cambio ----------
// GET /Itinerarios/:id?viewer=<mi id>   (solo los integrantes lo pueden abrir)
router.get('/Itinerarios/:id', ruta(async (req, res) => {
    const idItinerario = Number(req.params.id);
    const it = await exigirIntegrante(idItinerario, Number(req.query.viewer));

    // DATE_FORMAT / TIME_FORMAT: así llegan como texto ("2026-08-19", "15:00") y no como Date,
    // que con la zona horaria se recorre un día.
    const paradas = await query(
        `SELECT p.ID_Parada, DATE_FORMAT(p.Dia_Ir, '%Y-%m-%d') AS Dia, TIME_FORMAT(p.Hora_Ir, '%H:%i') AS Hora, p.Orden,
                l.ID_Lugar, l.Nombre AS LugarNombre, l.Descripcion, l.Direccion, l.Foto,
                c.Nombre AS Categoria, c.Color,
                u.id AS AgregadorId, u.Nombre_De_Usuario AS AgregadorNombre, u.Foto AS AgregadorFoto
         FROM Itinerario_Parada p
         INNER JOIN Lugar l ON l.ID_Lugar = p.id_Lugar
         INNER JOIN Categoria c ON c.ID_Categoria = l.id_Categoria
         INNER JOIN V_Usuarios u ON u.id = p.id_Agregador
         WHERE p.id_Itinerario = ?
         ORDER BY p.Orden, p.ID_Parada`,
        [idItinerario]
    );

    // El dueño primero, luego los demás por nombre. (El dueño sale aunque le falte su fila en la tabla.)
    const integrantes = await query(
        `SELECT u.id, u.Nombre_De_Usuario, u.Correo, u.Foto, u.Banner, u.Biografia, u.Estado
         FROM V_Usuarios u
         WHERE u.id = ? OR u.id IN (SELECT id_Usuario FROM Itinerario_Integrante WHERE id_Itinerario = ?)
         ORDER BY (u.id = ?) DESC, u.Nombre_De_Usuario`,
        [it.id_Usuario, idItinerario, it.id_Usuario]
    );

    // Último cambio ("Usuario X agregó una parada")
    let ultimaModificacion = null;
    try {
        const [log] = await query(
            `SELECT l.Accion, DATE_FORMAT(l.Fecha, '%Y-%m-%d %H:%i:%s') AS Fecha, u.id, u.Nombre_De_Usuario
             FROM Itinerario_Log l
             INNER JOIN V_Usuarios u ON u.id = l.id_Usuario
             WHERE l.id_Itinerario = ?
             ORDER BY l.ID_Log DESC LIMIT 1`,
            [idItinerario]
        );
        if (log) ultimaModificacion = { accion: log.Accion, fecha: log.Fecha, usuario: { id: log.id, username: log.Nombre_De_Usuario } };
    } catch (err) {
        console.error('No se pudo leer el historial del itinerario (¿corriste integrantes.sql?):', err.message);
    }

    res.json({
        success: true,
        itinerario: {
            id: it.ID_Itinerario, idUsuario: it.id_Usuario, nombre: it.Nombre, foto: urlPublica(it.Imagen, req),
            esDuenio: it.esDuenio,
            completado: !!it.Completado,
        },
        integrantes: integrantes.map(u => ({
            id: u.id,
            username: u.Nombre_De_Usuario,
            email: u.Correo,
            biografia: u.Biografia,
            foto: urlPublica(u.Foto, req),
            banner: urlPublica(u.Banner, req),
            estado: u.Estado,
            esDuenio: Number(u.id) === Number(it.id_Usuario),
        })),
        ultimaModificacion,
        paradas: paradas.map(p => ({
            id: p.ID_Parada,
            dia: p.Dia,
            hora: p.Hora,
            orden: p.Orden,
            lugar: {
                id: p.ID_Lugar,
                nombre: p.LugarNombre,
                descripcion: p.Descripcion || p.Direccion,
                foto: urlPublica(p.Foto, req),
                categoria: p.Categoria,
                color: p.Color,
            },
            agregadoPor: { id: p.AgregadorId, username: p.AgregadorNombre, foto: urlPublica(p.AgregadorFoto, req) },
        })),
    });
}));

// ---------- Agregar un Lugar a un itinerario (botón "Agregar +") ----------
// body: { idUsuario, idLugar }. Puede cualquier integrante.
// La parada nueva queda al final, el mismo día que la última parada (o hoy) a las 12:00.
router.post('/Itinerarios/:id/Paradas', ruta(async (req, res) => {
    const idItinerario = Number(req.params.id);
    const idUsuario = idUsuarioDe(req);
    const idLugar = Number(req.body.idLugar);

    const it = await exigirIntegrante(idItinerario, idUsuario);
    if (!idLugar) throw httpError(400, 'Falta el lugar');

    const [{ Siguiente }] = await query('SELECT COALESCE(MAX(Orden), -1) + 1 AS Siguiente FROM Itinerario_Parada WHERE id_Itinerario = ?', [idItinerario]);
    const [ultima] = await query(
        `SELECT DATE_FORMAT(Dia_Ir, '%Y-%m-%d') AS Dia FROM Itinerario_Parada
         WHERE id_Itinerario = ? ORDER BY Orden DESC, ID_Parada DESC LIMIT 1`,
        [idItinerario]
    );

    const r = await query(
        `INSERT INTO Itinerario_Parada (id_Itinerario, id_Lugar, Dia_Ir, Hora_Ir, Orden, id_Agregador)
         VALUES (?, ?, COALESCE(?, CURDATE()), '12:00:00', ?, ?)`,
        [idItinerario, idLugar, ultima?.Dia ?? null, Siguiente, idUsuario]
    );

    await registrar(idItinerario, idUsuario, 'agregó una parada');

    res.status(201).json({ success: true, parada: { id: r.insertId }, itinerario: { id: idItinerario, nombre: it.Nombre } });
}));

// ---------- Quitar una parada (cualquier integrante) ----------
router.delete('/Itinerarios/:id/Paradas/:idParada', ruta(async (req, res) => {
    const idItinerario = Number(req.params.id);
    const idUsuario = idUsuarioDe(req);
    await exigirIntegrante(idItinerario, idUsuario);

    const r = await query('DELETE FROM Itinerario_Parada WHERE ID_Parada = ? AND id_Itinerario = ?', [req.params.idParada, idItinerario]);
    if (r.affectedRows > 0) await registrar(idItinerario, idUsuario, 'quitó una parada');

    res.json({ success: true });
}));

// ---------- Guardar la edición (nombre, foto, orden, día y hora, paradas quitadas) ----------
// multipart/form-data:
//   idUsuario, nombre,
//   foto (archivo, opcional), quitarFoto ("1"),
//   paradas = JSON [{ id, dia: "2026-08-19", hora: "15:00" }, ...]  (en el orden nuevo)
//   quitar  = JSON [idParada, ...]
// Cualquier integrante puede cambiar paradas; el nombre y la foto solo el dueño (para los demás se ignoran).
router.put('/Itinerarios/:id', ruta(async (req, res) => {
    await subir(req, res);

    const idItinerario = Number(req.params.id);
    const idUsuario = idUsuarioDe(req);
    const it = await exigirIntegrante(idItinerario, idUsuario);

    let nombre = it.Nombre;
    if (it.esDuenio) {
        nombre = String(req.body.nombre ?? '').trim();
        if (nombre.length < 1 || nombre.length > 100) throw httpError(400, 'El nombre debe tener entre 1 y 100 caracteres');
    }

    const leerLista = (texto) => { try { const v = JSON.parse(texto || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
    const paradas = leerLista(req.body.paradas);
    const quitar = leerLista(req.body.quitar).map(Number).filter(Boolean);

    // Cómo están ahora (en orden), para validar y para saber qué cambió
    const actuales = await query(
        `SELECT ID_Parada, DATE_FORMAT(Dia_Ir, '%Y-%m-%d') AS Dia, TIME_FORMAT(Hora_Ir, '%H:%i') AS Hora
         FROM Itinerario_Parada WHERE id_Itinerario = ? ORDER BY Orden, ID_Parada`,
        [idItinerario]
    );
    const propias = new Map(actuales.map(r => [r.ID_Parada, r]));

    for (const p of paradas) {
        if (!propias.has(Number(p.id))) throw httpError(400, 'Hay una parada que no pertenece a este itinerario');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(p.dia) || Number.isNaN(Date.parse(p.dia))) throw httpError(400, 'Hay un día no válido');
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(p.hora)) throw httpError(400, 'Hay una hora no válida');
    }

    let imagen = it.Imagen;
    let nueva = null;
    if (it.esDuenio) {
        if (req.file) { nueva = await guardarImagen(req.file, 'itinerarios'); imagen = nueva; }
        else if (req.body.quitarFoto === '1') imagen = null;
    }

    try {
        await query('UPDATE Itinerario SET Nombre = ?, Imagen = ? WHERE ID_Itinerario = ?', [nombre, imagen, idItinerario]);

        if (quitar.length > 0) {
            await query('DELETE FROM Itinerario_Parada WHERE id_Itinerario = ? AND ID_Parada IN (?)', [idItinerario, quitar]);
        }

        // La posición en la lista = el Orden nuevo
        for (let i = 0; i < paradas.length; i++) {
            const p = paradas[i];
            if (quitar.includes(Number(p.id))) continue;
            await query(
                'UPDATE Itinerario_Parada SET Orden = ?, Dia_Ir = ?, Hora_Ir = ? WHERE ID_Parada = ? AND id_Itinerario = ?',
                [i, p.dia, `${p.hora}:00`, p.id, idItinerario]
            );
        }
    } catch (err) {
        await borrarImagen(nueva); // no dejar archivos huérfanos
        throw err;
    }

    if (imagen !== it.Imagen) await borrarImagen(it.Imagen);

    // ---- Historial: solo se apunta lo que de verdad cambió ----
    const quitadasReales = quitar.filter(id => propias.has(id)).length;
    const restantes = paradas.filter(p => !quitar.includes(Number(p.id)));
    const ordenAntes = actuales.map(r => r.ID_Parada).filter(id => !quitar.includes(id)).join(',');
    const ordenDespues = restantes.map(p => Number(p.id)).join(',');
    const cambioHorario = restantes.some(p => {
        const antes = propias.get(Number(p.id));
        return antes.Dia !== p.dia || antes.Hora !== p.hora;
    });

    if (it.esDuenio && nombre !== it.Nombre) await registrar(idItinerario, idUsuario, 'cambió el nombre del itinerario');
    if (imagen !== it.Imagen) await registrar(idItinerario, idUsuario, 'cambió la foto del itinerario');
    if (quitadasReales > 0) await registrar(idItinerario, idUsuario, quitadasReales === 1 ? 'quitó una parada' : `quitó ${quitadasReales} paradas`);
    if (restantes.length === actuales.length - quitadasReales && ordenAntes !== ordenDespues) await registrar(idItinerario, idUsuario, 'reordenó las paradas');
    if (cambioHorario) await registrar(idItinerario, idUsuario, 'cambió el día u hora de una parada');

    res.json({ success: true, itinerario: { id: idItinerario, nombre, foto: urlPublica(imagen, req) } });
}));

export default router;