export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Las rutas de multimedia vienen como "/uploads/posts/xxx.jpg"
export const urlMedia = (ruta) => (ruta?.startsWith('http') ? ruta : `${API_URL}${ruta}`);

// Autocompletar de lugares. Recibe un signal para cancelar la petición anterior.
export async function buscarLugares(q, signal) {
    const response = await fetch(`${API_URL}/Lugares/buscar?q=${encodeURIComponent(q)}`, { signal });
    return response.json();
}

// archivos = array de File reales (NO las URLs de previsualización)
export async function crearPost({ idUsuario, idLugar, descripcion, archivos = [] }) {
    const form = new FormData();
    form.append('idUsuario', idUsuario);
    form.append('idLugar', idLugar);
    form.append('descripcion', descripcion);
    archivos.forEach(file => form.append('media', file));

    // OJO: con FormData NO se pone Content-Type, el navegador agrega el boundary solo
    const response = await fetch(`${API_URL}/Posts`, { method: 'POST', body: form });
    return response.json();
}

// viewerId = el Usuario que está viendo (para saber si ya dio like y si ya sigue al autor)
export async function getPosts(viewerId = null, limit = 20, offset = 0) {
    const response = await fetch(`${API_URL}/Posts?viewer=${viewerId ?? ''}&limit=${limit}&offset=${offset}`);
    return response.json();
}

export async function getPostsUsuario(id, viewerId = null, limit = 20, offset = 0) {
    const response = await fetch(`${API_URL}/Posts/Usuario/${id}?viewer=${viewerId ?? ''}&limit=${limit}&offset=${offset}`);
    return response.json();
}

export async function getComentarios(idPost, viewerId = null) {
    const response = await fetch(`${API_URL}/Posts/${idPost}/Comentarios?viewer=${viewerId ?? ''}`);
    return response.json();
}

export async function crearComentario(idPost, { idUsuario, texto, idPadre = null }) {
    const response = await fetch(`${API_URL}/Posts/${idPost}/Comentarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idUsuario, texto, idPadre }),
    });
    return response.json();
}

// like = true (dar like) | false (quitar like). Devuelve { success, totalLikes }
export async function likePost(idPost, idUsuario, like) {
    const response = await fetch(`${API_URL}/Posts/${idPost}/Like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idUsuario, like }),
    });
    return response.json();
}

export async function likeComentario(idComentario, idUsuario, like) {
    const response = await fetch(`${API_URL}/Comentarios/${idComentario}/Like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idUsuario, like }),
    });
    return response.json();
}