import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import db from '../database/connection.js';

const router = express.Router();

// ---------- Multimedia: se guarda en disco, en la BD solo la ruta ----------
const UPLOADS_DIR = path.resolve('uploads', 'posts');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const TIPOS = {
    'image/png': 'imagen',
    'image/jpeg': 'imagen',
    'image/webp': 'imagen',
    'video/mp4': 'video',
};

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, UPLOADS_DIR),
        // nombre aleatorio: evita choques y que alguien adivine/pise archivos
        filename: (req, file, cb) =>
            cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase()),
    }),
    limits: { fileSize: 50 * 1024 * 1024, files: 10 },
    fileFilter: (req, file, cb) =>
        TIPOS[file.mimetype] ? cb(null, true) : cb(new Error('Tipo de archivo no permitido')),
});

const borrarArchivos = (files = []) =>
    files.forEach(f => fs.unlink(f.path, () => {}));

// ---------- Helper: arma los posts con su multimedia ----------
const POSTS_SQL = `
    SELECT p.ID_Post, p.Descripcion, p.Fecha, p.ID_Lugar, l.Nombre AS Lugar,
           u.Folio AS UsuarioId, u.Nombre_De_Usuario, u.Correo, u.Foto,
           (SELECT COUNT(*) FROM Comentario c WHERE c.ID_Post = p.ID_Post) AS TotalComentarios
    FROM Post p
    INNER JOIN V_Usuarios u ON u.Folio = p.id_Usuario
    INNER JOIN Lugar l ON l.ID_Lugar = p.ID_Lugar
`;

function cargarPosts(where, params, res, limit = 20, offset = 0) {
    const sql = `${POSTS_SQL} ${where} ORDER BY p.Fecha DESC LIMIT ? OFFSET ?`;

    db.query(sql, [...params, limit, offset], (err, posts) => {
        if (err) {
            console.error('Error cargando posts:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
        if (posts.length === 0) return res.status(200).json({ success: true, posts: [] });

        const ids = posts.map(p => p.ID_Post);
        db.query(
            'SELECT ID_Post, Url, Tipo FROM Post_Media WHERE ID_Post IN (?) ORDER BY ID_Post, Orden',
            [ids],
            (err2, media) => {
                if (err2) {
                    console.error('Error cargando multimedia:', err2);
                    return res.status(500).json({ success: false, error: err2.message });
                }

                const resultado = posts.map(p => ({
                    id: p.ID_Post,
                    descripcion: p.Descripcion,
                    fecha: p.Fecha,
                    lugar: { id: p.ID_Lugar, nombre: p.Lugar },
                    usuario: {
                        id: p.UsuarioId,
                        username: p.Nombre_De_Usuario,
                        email: p.Correo,
                        foto: p.Foto,
                    },
                    totalComentarios: p.TotalComentarios,
                    media: media
                        .filter(m => m.ID_Post === p.ID_Post)
                        .map(m => ({ url: m.Url, tipo: m.Tipo })),
                }));

                res.status(200).json({ success: true, posts: resultado });
            }
        );
    });
}

const paginacion = req => ({
    limit: Math.min(Number(req.query.limit) || 20, 50),
    offset: Number(req.query.offset) || 0,
});

// =====================
// BUSCAR LUGARES (autocompletar del ShowToPost)
// =====================
router.get('/Lugares/buscar', (req, res) => {
    const q = (req.query.q || '').trim();
    if (q.length < 1) return res.status(200).json({ success: true, lugares: [] });

    // escapar % y _ para que el usuario no pueda meter comodines
    const limpio = q.replace(/[\\%_]/g, '\\$&');

    // primero los que EMPIEZAN con lo escrito, luego los que lo contienen, luego los más cortos
    const sql = `
        SELECT l.ID_Lugar, l.Nombre, c.Nombre AS Categoria
        FROM Lugar l
        LEFT JOIN Categoria c ON c.ID_Categoria = l.ID_Categoria
        WHERE l.Nombre LIKE ?
        ORDER BY (l.Nombre LIKE ?) DESC, CHAR_LENGTH(l.Nombre) ASC
        LIMIT 20`;

    db.query(sql, [`%${limpio}%`, `${limpio}%`], (err, result) => {
        if (err) {
            console.error('Error buscando lugares:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
        res.status(200).json({
            success: true,
            lugares: result.map(l => ({
                id: l.ID_Lugar,
                nombre: l.Nombre,
                categoria: l.Categoria,
            })),
        });
    });
});

// =====================
// CREAR POST  (multipart/form-data: idUsuario, idLugar, descripcion, media[])
// =====================
router.post('/Posts', (req, res) => {
    upload.array('media', 10)(req, res, (uploadErr) => {
        if (uploadErr) {
            return res.status(400).json({ success: false, error: uploadErr.message });
        }

        const { idUsuario, idLugar } = req.body;
        const descripcion = (req.body.descripcion || '').trim();
        const files = req.files || [];

        if (!idUsuario || !idLugar) {
            borrarArchivos(files);
            return res.status(400).json({ success: false, error: 'Faltan el usuario o el lugar' });
        }

        db.query(
            'INSERT INTO Post (id_Usuario, ID_Lugar, Descripcion) VALUES (?,?,?)',
            [idUsuario, idLugar, descripcion],
            (err, result) => {
                if (err) {
                    borrarArchivos(files);
                    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
                        return res.status(404).json({ success: false, error: 'Usuario o lugar no existe' });
                    }
                    console.error('Error creando post:', err);
                    return res.status(500).json({ success: false, error: err.message });
                }

                const idPost = result.insertId;
                if (files.length === 0) {
                    return res.status(201).json({ success: true, id: idPost });
                }

                const filas = files.map((f, i) => [
                    idPost,
                    `/uploads/posts/${f.filename}`,
                    TIPOS[f.mimetype],
                    i,
                ]);

                db.query('INSERT INTO Post_Media (ID_Post, Url, Tipo, Orden) VALUES ?', [filas], (err2) => {
                    if (err2) {
                        console.error('Error guardando multimedia:', err2);
                        // no dejar un post a medias
                        db.query('DELETE FROM Post WHERE ID_Post = ?', [idPost]);
                        borrarArchivos(files);
                        return res.status(500).json({ success: false, error: err2.message });
                    }
                    res.status(201).json({ success: true, id: idPost });
                });
            }
        );
    });
});

// =====================
// LEER POSTS
// =====================
// Inicio
router.get('/Posts', (req, res) => {
    const { limit, offset } = paginacion(req);
    cargarPosts('', [], res, limit, offset);
});

// Perfil de un Usuario
router.get('/Posts/Usuario/:id', (req, res) => {
    const { limit, offset } = paginacion(req);
    cargarPosts('WHERE p.id_Usuario = ?', [req.params.id], res, limit, offset);
});

// =====================
// COMENTARIOS
// =====================
// Todos los comentarios de un post (planos; el front arma el hilo con ID_Padre)
router.get('/Posts/:id/Comentarios', (req, res) => {
    const sql = `
        SELECT c.ID_Comentario, c.ID_Padre, c.Texto, c.Fecha,
               u.Folio AS UsuarioId, u.Nombre_De_Usuario, u.Correo, u.Foto
        FROM Comentario c
        INNER JOIN V_Usuarios u ON u.Folio = c.id_Usuario
        WHERE c.ID_Post = ?
        ORDER BY c.Fecha ASC, c.ID_Comentario ASC`;

    db.query(sql, [req.params.id], (err, result) => {
        if (err) {
            console.error('Error cargando comentarios:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
        res.status(200).json({
            success: true,
            comentarios: result.map(c => ({
                id: c.ID_Comentario,
                idPadre: c.ID_Padre,
                texto: c.Texto,
                fecha: c.Fecha,
                usuario: {
                    id: c.UsuarioId,
                    username: c.Nombre_De_Usuario,
                    email: c.Correo,
                    foto: c.Foto,
                },
            })),
        });
    });
});

// Comentar un post o responder a un comentario (idPadre)
router.post('/Posts/:id/Comentarios', (req, res) => {
    const { idUsuario, idPadre } = req.body;
    const texto = (req.body.texto || '').trim();

    if (!idUsuario || !texto) {
        return res.status(400).json({ success: false, error: 'Falta el usuario o el texto' });
    }
    if (texto.length > 1000) {
        return res.status(400).json({ success: false, error: 'El comentario es muy largo' });
    }

    const insertar = () => {
        db.query(
            'INSERT INTO Comentario (ID_Post, id_Usuario, ID_Padre, Texto) VALUES (?,?,?,?)',
            [req.params.id, idUsuario, idPadre || null, texto],
            (err, result) => {
                if (err) {
                    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
                        return res.status(404).json({ success: false, error: 'Post o usuario no existe' });
                    }
                    console.error('Error comentando:', err);
                    return res.status(500).json({ success: false, error: err.message });
                }
                res.status(201).json({ success: true, id: result.insertId });
            }
        );
    };

    // el comentario padre tiene que ser del MISMO post
    if (idPadre) {
        db.query(
            'SELECT ID_Comentario FROM Comentario WHERE ID_Comentario = ? AND ID_Post = ?',
            [idPadre, req.params.id],
            (err, rows) => {
                if (err) return res.status(500).json({ success: false, error: err.message });
                if (rows.length === 0) {
                    return res.status(400).json({ success: false, error: 'El comentario a responder no pertenece a este post' });
                }
                insertar();
            }
        );
    } else {
        insertar();
    }
});

export default router;