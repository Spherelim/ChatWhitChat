import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

// Revisa los primeros bytes (no confiamos en el mimetype que manda el cliente)
function extensionReal(buf) {
    if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return '.webp';
    if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return '.jpg';
    if (buf.length > 8 && buf.toString('hex', 0, 8) === '89504e470d0a1a0a') return '.png';
    return null;
}

// Guarda una imagen (de multer.memoryStorage) en uploads/<carpeta>/ y devuelve la ruta para la BD:
// "/uploads/<carpeta>/<uuid>.webp"
export async function guardarImagen(file, carpeta) {
    const ext = extensionReal(file.buffer);
    if (!ext) throw Object.assign(new Error('El archivo no es una imagen válida (webp, jpg o png)'), { status: 400 });

    const dir = path.resolve('uploads', carpeta);
    await fs.mkdir(dir, { recursive: true });

    const nombre = `${crypto.randomUUID()}${ext}`;
    await fs.writeFile(path.join(dir, nombre), file.buffer);
    return `/uploads/${carpeta}/${nombre}`;
}

// Borra una imagen guardada con guardarImagen. Ignora cualquier ruta que no sea de uploads.
export async function borrarImagen(ruta) {
    const m = /^\/uploads\/(itinerarios|perfiles|posts)\/([\w.-]+)$/.exec(ruta || '');
    if (!m) return;
    try { await fs.unlink(path.resolve('uploads', m[1], m[2])); } catch { /* ya no existía */ }
}