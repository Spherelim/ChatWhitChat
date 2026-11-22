import express from 'express';
import multer from 'multer';
import db from '../database/connection.js';
import { urlPublica } from '../utils/urlPublica.js';
import { guardarImagen, borrarImagen } from '../utils/imagenes.js';

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

// El que modifica tiene que ser el dueño del itinerario.
// OJO: el idUsuario viaja en el body/query (todavía no hay JWT, igual que en el resto de tu API).
async function exigirDuenio(idItinerario, idUsuario) {
    if (!idItinerario || !idUsuario) throw httpError(400, 'Faltan datos');

    const rows = await query('SELECT id_Usuario, Nombre, Imagen FROM Itinerario WHERE ID_Itinerario = ?', [idItinerario]);
    if (rows.length === 0) throw httpError(404, 'Itinerario no encontrado');
    if (Number(rows[0].id_Usuario) !== idUsuario) throw httpError(403, 'Este itinerario no es tuyo');
    return rows[0];
}

const idUsuarioDe = (req) => Number(req.body?.idUsuario ?? req.query.idUsuario);

// ---------- Lista de MIS itinerarios ----------
router.get('/Itinerarios/Usuario/:id', ruta(async (req, res) => {
    const rows = await query(
        `SELECT i.ID_Itinerario, i.Nombre, i.Imagen, i.Completado, COUNT(p.ID_Parada) AS Total
         FROM Itinerario i
         LEFT JOIN Itinerario_Parada p ON p.id_Itinerario = i.ID_Itinerario
         WHERE i.id_Usuario = ?
         GROUP BY i.ID_Itinerario
         ORDER BY i.F_Creacion DESC, i.ID_Itinerario DESC`,
        [req.params.id]
    );

    res.json({
        success: true,
        itinerarios: rows.map(r => ({
            id: r.ID_Itinerario,
            nombre: r.Nombre,
            foto: urlPublica(r.Imagen, req),
            completado: !!r.Completado,
            totalParadas: r.Total,
        })),
    });
}));

// ---------- Crear itinerario ----------
router.post('/Itinerarios', ruta(async (req, res) => {
    const idUsuario = idUsuarioDe(req);
    const nombre = String(req.body.nombre ?? 'Nuevo Itinerario').trim().slice(0, 100) || 'Nuevo Itinerario';
    if (!idUsuario) throw httpError(400, 'Faltan datos');

    const r = await query('INSERT INTO Itinerario (id_Usuario, Nombre) VALUES (?, ?)', [idUsuario, nombre]);
    res.status(201).json({ success: true, itinerario: { id: r.insertId, nombre, foto: null, completado: false, totalParadas: 0 } });
}));

// ---------- Eliminar itinerario (sus paradas se borran solas por el CASCADE) ----------
router.delete('/Itinerarios/:id', ruta(async (req, res) => {
    const it = await exigirDuenio(Number(req.params.id), idUsuarioDe(req));
    await query('DELETE FROM Itinerario WHERE ID_Itinerario = ?', [req.params.id]);
    await borrarImagen(it.Imagen);
    res.json({ success: true });
}));

// ---------- Un itinerario con sus paradas (en orden) ----------
router.get('/Itinerarios/:id', ruta(async (req, res) => {
    const [it] = await query('SELECT ID_Itinerario, id_Usuario, Nombre, Imagen FROM Itinerario WHERE ID_Itinerario = ?', [req.params.id]);
    if (!it) throw httpError(404, 'Itinerario no encontrado');

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
        [req.params.id]
    );

    res.json({
        success: true,
        itinerario: { id: it.ID_Itinerario, idUsuario: it.id_Usuario, nombre: it.Nombre, foto: urlPublica(it.Imagen, req) },
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
// body: { idUsuario, idLugar }
// La parada nueva queda al final, el mismo día que la última parada (o hoy) a las 12:00.
// Después el usuario cambia día/hora en el modo edición.
router.post('/Itinerarios/:id/Paradas', ruta(async (req, res) => {
    const idItinerario = Number(req.params.id);
    const idUsuario = idUsuarioDe(req);
    const idLugar = Number(req.body.idLugar);

    const it = await exigirDuenio(idItinerario, idUsuario);
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

    res.status(201).json({ success: true, parada: { id: r.insertId }, itinerario: { id: idItinerario, nombre: it.Nombre } });
}));

// ---------- Quitar una parada ----------
router.delete('/Itinerarios/:id/Paradas/:idParada', ruta(async (req, res) => {
    await exigirDuenio(Number(req.params.id), idUsuarioDe(req));
    await query('DELETE FROM Itinerario_Parada WHERE ID_Parada = ? AND id_Itinerario = ?', [req.params.idParada, req.params.id]);
    res.json({ success: true });
}));

// ---------- Guardar la edición (nombre, foto, orden, día y hora, paradas quitadas) ----------
// multipart/form-data:
//   idUsuario, nombre,
//   foto (archivo, opcional), quitarFoto ("1"),
//   paradas = JSON [{ id, dia: "2026-08-19", hora: "15:00" }, ...]  (en el orden nuevo)
//   quitar  = JSON [idParada, ...]
router.put('/Itinerarios/:id', ruta(async (req, res) => {
    await subir(req, res);

    const idItinerario = Number(req.params.id);
    const it = await exigirDuenio(idItinerario, idUsuarioDe(req));

    const nombre = String(req.body.nombre ?? '').trim();
    if (nombre.length < 1 || nombre.length > 100) throw httpError(400, 'El nombre debe tener entre 1 y 100 caracteres');

    const leerLista = (texto) => { try { const v = JSON.parse(texto || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
    const paradas = leerLista(req.body.paradas);
    const quitar = leerLista(req.body.quitar).map(Number).filter(Boolean);

    // Solo se aceptan paradas que de verdad son de este itinerario
    const propias = new Set((await query('SELECT ID_Parada FROM Itinerario_Parada WHERE id_Itinerario = ?', [idItinerario])).map(r => r.ID_Parada));

    for (const p of paradas) {
        if (!propias.has(Number(p.id))) throw httpError(400, 'Hay una parada que no pertenece a este itinerario');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(p.dia) || Number.isNaN(Date.parse(p.dia))) throw httpError(400, 'Hay un día no válido');
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(p.hora)) throw httpError(400, 'Hay una hora no válida');
    }

    let imagen = it.Imagen;
    let nueva = null;
    if (req.file) { nueva = await guardarImagen(req.file, 'itinerarios'); imagen = nueva; }
    else if (req.body.quitarFoto === '1') imagen = null;

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

    res.json({ success: true, itinerario: { id: idItinerario, nombre, foto: urlPublica(imagen, req) } });
}));

export default router;