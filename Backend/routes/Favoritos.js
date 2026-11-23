import express from 'express';
import db from '../database/connection.js';
import { urlPublica } from '../utils/urlPublica.js';

const router = express.Router();

// Lugares favoritos de un Usuario (se ven en la pestaña "Lugares Favoritos" de su Perfil).
// Devuelve lo que necesita <VenueTag/>: nombre, categoria, descripcion, foto y color.
router.get('/Favoritos/Usuario/:id', (req, res) => {
    const sql = `
        SELECT l.ID_Lugar, l.Nombre, l.Descripcion, l.Foto,
               c.Nombre AS Categoria, c.Color
        FROM Lugar_Fav lf
        INNER JOIN Lugar l ON l.ID_Lugar = lf.id_Lugar
        INNER JOIN Categoria c ON c.ID_Categoria = l.id_Categoria
        WHERE lf.id_Usuario = ?
        ORDER BY lf.Fecha_Ingreso DESC, l.ID_Lugar DESC`;

    db.query(sql, [req.params.id], (err, rows) => {
        if (err) {
            console.error('Error cargando favoritos:', err);
            return res.status(500).json({ success: false, error: err.message });
        }

        res.json({
            success: true,
            lugares: rows.map(r => ({
                id: r.ID_Lugar,
                nombre: r.Nombre,
                descripcion: r.Descripcion,
                foto: urlPublica(r.Foto, req),
                categoria: r.Categoria,
                color: r.Color,
            })),
        });
    });
});

// Marcar / quitar un Lugar de favoritos. body: { idUsuario, favorito: true | false }
// Es idempotente: marcar dos veces no da error.
// OJO: el idUsuario viaja en el body (todavía no hay JWT, igual que en el resto de tu API).
router.post('/Favoritos/:idLugar', (req, res) => {
    const idLugar = Number(req.params.idLugar);
    const idUsuario = Number(req.body.idUsuario);
    const favorito = req.body.favorito !== false;

    if (!idLugar || !idUsuario) {
        return res.status(400).json({ success: false, error: 'Faltan datos' });
    }

    const sql = favorito
        ? 'INSERT INTO Lugar_Fav (id_Lugar, id_Usuario) VALUES (?, ?) ON DUPLICATE KEY UPDATE id_Lugar = id_Lugar'
        : 'DELETE FROM Lugar_Fav WHERE id_Lugar = ? AND id_Usuario = ?';

    db.query(sql, [idLugar, idUsuario], (err) => {
        if (err) {
            if (err.code === 'ER_NO_REFERENCED_ROW_2') {
                return res.status(404).json({ success: false, error: 'Lugar o usuario no encontrado' });
            }
            console.error('Error en favoritos:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ success: true });
    });
});

export default router;