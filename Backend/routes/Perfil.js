import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import db from '../database/connection.js';
import { urlPublica } from '../utils/urlPublica.js';

const router = express.Router();

// ---------- Archivos ----------
// El front ya manda las imágenes recortadas y comprimidas (webp ~50-150 KB),
// por eso el límite es bajo. Se guardan en memoria para revisar que de verdad sean imágenes
// antes de escribir nada en el disco.
const DIR = path.resolve('uploads', 'perfiles');
const RUTA_BD = '/uploads/perfiles/';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024, files: 2 },
}).fields([{ name: 'foto', maxCount: 1 }, { name: 'banner', maxCount: 1 }]);

// Revisa los primeros bytes (no confiamos en el mimetype que manda el cliente)
function extensionReal(buf) {
    if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return '.webp';
    if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return '.jpg';
    if (buf.length > 8 && buf.toString('hex', 0, 8) === '89504e470d0a1a0a') return '.png';
    return null;
}

async function guardarImagen(file) {
    const ext = extensionReal(file.buffer);
    if (!ext) throw Object.assign(new Error('El archivo no es una imagen válida (webp, jpg o png)'), { status: 400 });

    await fs.mkdir(DIR, { recursive: true });
    const nombre = `${crypto.randomUUID()}${ext}`;
    await fs.writeFile(path.join(DIR, nombre), file.buffer);
    return RUTA_BD + nombre;
}

// Solo borra archivos que están dentro de uploads/perfiles (por si la BD trae otra cosa)
async function borrarImagen(ruta) {
    if (!ruta || !ruta.startsWith(RUTA_BD)) return;
    try { await fs.unlink(path.join(DIR, path.basename(ruta))); } catch { /* ya no existía */ }
}

// ---------- Enlaces ----------
const MAX_LINKS = 10;

function normalizarLink(texto) {
    let url = String(texto || '').trim();
    if (!url || url.length > 500) return null;

    if (/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(url)) url = `mailto:${url}`;// correo suelto
    else if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = `https://${url}`;// "instagram.com/x"

    try {
        const u = new URL(url);
        // Solo estos protocolos: así nadie guarda un "javascript:..." que se ejecute al dar clic
        if (!['http:', 'https:', 'mailto:'].includes(u.protocol)) return null;
        return url;
    } catch { return null; }
}

// ---------- Helpers ----------
const query = (sql, params = []) => new Promise((resolve, reject) =>
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows))));

const mapUsuario = (r, req) => ({
    id: r.id,
    foto: urlPublica(r.Foto, req),
    banner: urlPublica(r.Banner, req),
    username: r.Nombre_De_Usuario,
    email: r.Correo,
    bio: r.Biografia,
    estado: r.Estado,
});

// ---------- GET enlaces de un Usuario (se ven en su Perfil) ----------
router.get('/Contactos/Usuario/:id', async (req, res) => {
    try {
        const rows = await query('SELECT ID_Contacto, URL FROM contacto WHERE id_Usuario = ? ORDER BY ID_Contacto', [req.params.id]);
        res.json({ success: true, contactos: rows.map(r => ({ id: r.ID_Contacto, url: r.URL })) });
    } catch (err) {
        console.error('Error cargando contactos:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ---------- PUT editar Perfil ----------
// multipart/form-data: username, email, bio, links (JSON ["url", ...]),
// foto, banner (archivos, opcionales), quitarFoto, quitarBanner ("1")
// OJO: el id viaja en la URL (igual que en el resto de la API, todavía no hay JWT).
router.put('/Perfil/Usuario/:id', (req, res) => {
    upload(req, res, async (uploadErr) => {
        if (uploadErr) {
            const msg = uploadErr.code === 'LIMIT_FILE_SIZE' ? 'La imagen pesa más de 2 MB' : uploadErr.message;
            return res.status(400).json({ success: false, error: msg });
        }

        const nuevos = []; // archivos escritos en esta petición (para borrarlos si algo sale mal)

        try {
            const id = Number(req.params.id);
            if (!id) return res.status(400).json({ success: false, error: 'Usuario inválido' });

            const username = String(req.body.username ?? '').trim();
            const email = String(req.body.email ?? '').trim();
            const bio = String(req.body.bio ?? '').trim();

            if (username.length < 3 || username.length > 50 || /[<>]/.test(username))
                return res.status(400).json({ success: false, error: 'El nombre de usuario debe tener entre 3 y 50 caracteres' });
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150)
                return res.status(400).json({ success: false, error: 'El correo no es válido' });
            if (bio.length > 100)
                return res.status(400).json({ success: false, error: 'La biografía no puede pasar de 100 caracteres' });

            let links = [];
            try { links = JSON.parse(req.body.links || '[]'); } catch { /* se queda vacío */ }
            if (!Array.isArray(links)) links = [];
            if (links.length > MAX_LINKS)
                return res.status(400).json({ success: false, error: `Máximo ${MAX_LINKS} enlaces` });

            const limpios = [];
            for (const l of links) {
                const url = normalizarLink(l);
                if (!url) return res.status(400).json({ success: false, error: `Enlace no válido: ${String(l).slice(0, 60)}` });
                if (!limpios.includes(url)) limpios.push(url);
            }

            const actual = await query('SELECT Foto, Banner FROM usuario WHERE Folio = ?', [id]);
            if (actual.length === 0) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });

            let foto = actual[0].Foto;
            let banner = actual[0].Banner;

            if (req.files?.foto?.[0]) { foto = await guardarImagen(req.files.foto[0]); nuevos.push(foto); }
            else if (req.body.quitarFoto === '1') foto = null;

            if (req.files?.banner?.[0]) { banner = await guardarImagen(req.files.banner[0]); nuevos.push(banner); }
            else if (req.body.quitarBanner === '1') banner = null;

            try {
                await query(
                    'UPDATE usuario SET UserName = ?, Correo = ?, Biografia = ?, Foto = ?, Banner = ? WHERE Folio = ?',
                    [username, email, bio || null, foto, banner, id]
                );
            } catch (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    const campo = /Correo|email/i.test(err.sqlMessage) ? 'correo' : 'nombre de usuario';
                    throw Object.assign(new Error(`Ese ${campo} ya está en uso`), { status: 409 });
                }
                throw err;
            }

            // Enlaces: se reemplaza la lista completa por la nueva
            await query('DELETE FROM contacto WHERE id_Usuario = ?', [id]);
            if (limpios.length > 0) {
                await query('INSERT INTO contacto (URL, id_Usuario) VALUES ?', [limpios.map(url => [url, id])]);
            }

            // Ya todo quedó guardado: ahora sí se borran las imágenes viejas que se reemplazaron
            if (foto !== actual[0].Foto) await borrarImagen(actual[0].Foto);
            if (banner !== actual[0].Banner) await borrarImagen(actual[0].Banner);

            const [usuario] = await query('SELECT * FROM V_Usuarios WHERE id = ?', [id]);
            const contactos = await query('SELECT ID_Contacto, URL FROM contacto WHERE id_Usuario = ? ORDER BY ID_Contacto', [id]);

            res.json({
                success: true,
                user: mapUsuario(usuario, req),
                contactos: contactos.map(r => ({ id: r.ID_Contacto, url: r.URL })),
            });
        } catch (err) {
            await Promise.all(nuevos.map(borrarImagen)); // no dejar archivos huérfanos
            if (!err.status) console.error('Error editando perfil:', err);
            res.status(err.status || 500).json({ success: false, error: err.status ? err.message : 'No se pudo guardar el perfil' });
        }
    });
});

export default router;