import express from 'express';
import db from '../database/connection.js';

const router = express.Router();

const query = (sql, params = []) => new Promise((resolve, reject) =>
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows))));

const httpError = (status, message) => Object.assign(new Error(message), { status });

// Si el usuario nunca tocó sus ajustes (no tiene fila) valen estos
const POR_DEFECTO = { mostrarFavoritos: true, mostrarInsignias: true, encriptarChats: true };

// campo del front -> columna
const COLUMNAS = {
    mostrarFavoritos: 'Mostrar_Favoritos',
    mostrarInsignias: 'Mostrar_Insignias',
    encriptarChats: 'Encriptar_Chats',
};

// Los ajustes de un usuario (los usan también Favoritos, Itinerarios y el Chat).
export async function obtenerAjustes(idUsuario) {
    try {
        const [f] = await query(
            'SELECT Mostrar_Favoritos, Mostrar_Insignias, Encriptar_Chats FROM Ajuste_Usuario WHERE id_Usuario = ?',
            [idUsuario]
        );
        if (!f) return { ...POR_DEFECTO };

        return {
            mostrarFavoritos: !!f.Mostrar_Favoritos,
            mostrarInsignias: !!f.Mostrar_Insignias,
            encriptarChats: !!f.Encriptar_Chats,
        };
    } catch (err) {
        // Todavía no corriste ajustes.sql: todo sigue funcionando con los valores por defecto
        if (err.code === 'ER_NO_SUCH_TABLE') {
            console.error('Falta la tabla Ajuste_Usuario (corre ajustes.sql). Se usan los ajustes por defecto.');
            return { ...POR_DEFECTO };
        }
        throw err;
    }
}

const ruta = (fn) => async (req, res) => {
    try {
        await fn(req, res);
    } catch (err) {
        if (err.code === 'ER_NO_REFERENCED_ROW_2') return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        if (err.code === 'ER_NO_SUCH_TABLE') return res.status(500).json({ success: false, error: 'Falta la tabla Ajuste_Usuario (corre ajustes.sql)' });
        if (!err.status) console.error('Error en ajustes:', err);
        res.status(err.status || 500).json({ success: false, error: err.status ? err.message : 'Error del servidor' });
    }
};

// GET /Ajustes/:id?viewer=<mi id>
// Si pido los míos regresa todos; si pido los de otro usuario, solo lo que es público (el resto es privado).
router.get('/Ajustes/:id', ruta(async (req, res) => {
    const id = Number(req.params.id);
    if (!id) throw httpError(400, 'Faltan datos');

    const ajustes = await obtenerAjustes(id);

    if (Number(req.query.viewer) === id) return res.json({ success: true, ajustes });

    res.json({
        success: true,
        ajustes: { mostrarFavoritos: ajustes.mostrarFavoritos, mostrarInsignias: ajustes.mostrarInsignias },
    });
}));

// PUT /Ajustes/:id   body: { idUsuario, mostrarFavoritos?, mostrarInsignias?, encriptarChats? }
// Solo cada quien cambia SUS ajustes. Se puede mandar uno solo o varios.
router.put('/Ajustes/:id', ruta(async (req, res) => {
    const id = Number(req.params.id);
    if (!id || Number(req.body?.idUsuario) !== id) throw httpError(403, 'Solo puedes cambiar tus propios ajustes');

    const cambios = Object.entries(COLUMNAS)
        .filter(([campo]) => typeof req.body[campo] === 'boolean')
        .map(([campo, columna]) => [columna, req.body[campo] ? 1 : 0]);

    if (cambios.length === 0) throw httpError(400, 'No hay nada que cambiar');

    // Crea la fila si no existía (ON DUPLICATE KEY y no INSERT IGNORE, para que un usuario inexistente SÍ marque error)
    await query('INSERT INTO Ajuste_Usuario (id_Usuario) VALUES (?) ON DUPLICATE KEY UPDATE id_Usuario = id_Usuario', [id]);
    await query(
        `UPDATE Ajuste_Usuario SET ${cambios.map(([columna]) => `${columna} = ?`).join(', ')} WHERE id_Usuario = ?`,
        [...cambios.map(([, valor]) => valor), id]
    );

    res.json({ success: true, ajustes: await obtenerAjustes(id) });
}));

export default router;