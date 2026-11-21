import { API_URL } from './postService.js';

// Enlaces (YouTube, LinkedIn...) que puso un Usuario en su Perfil
export async function getContactos(idUsuario) {
    const response = await fetch(`${API_URL}/Contactos/Usuario/${idUsuario}`);
    return response.json();
}

// Guarda el Perfil completo: datos, enlaces y (si cambiaron) foto y banner.
// foto / banner = Blob ya recortado y comprimido (o null si no cambió)
export async function actualizarPerfil(idUsuario, {
    username, email, bio, links = [],
    foto = null, banner = null,
    quitarFoto = false, quitarBanner = false,
}) {
    const form = new FormData();
    form.append('username', username);
    form.append('email', email);
    form.append('bio', bio);
    form.append('links', JSON.stringify(links));
    if (foto) form.append('foto', foto, 'foto.webp');
    if (banner) form.append('banner', banner, 'banner.webp');
    if (quitarFoto) form.append('quitarFoto', '1');
    if (quitarBanner) form.append('quitarBanner', '1');

    // Con FormData NO se pone Content-Type, el navegador agrega el boundary solo
    const response = await fetch(`${API_URL}/Perfil/Usuario/${idUsuario}`, { method: 'PUT', body: form });
    return response.json();
}

// Misma regla que el backend: acepta "instagram.com/x", un correo suelto, o una URL completa.
// Devuelve la URL lista para guardar, o null si no es válida.
export function normalizarLink(texto) {
    let url = String(texto || '').trim();
    if (!url || url.length > 500) return null;

    if (/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(url)) url = `mailto:${url}`;
    else if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = `https://${url}`;

    try {
        const u = new URL(url);
        if (!['http:', 'https:', 'mailto:'].includes(u.protocol)) return null;
        if (u.protocol !== 'mailto:' && !u.hostname.includes('.')) return null; // "hola" -> https://hola
        return url;
    } catch { return null; }
}