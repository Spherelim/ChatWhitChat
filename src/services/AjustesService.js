import { API_URL } from './postService.js';

// Ajustes de un usuario -> { success, ajustes: { mostrarFavoritos, mostrarInsignias, encriptarChats? } }
// (encriptarChats solo viene cuando pides los TUYOS: viewer === idUsuario)
export async function getAjustes(idUsuario, viewer = null) {
    const response = await fetch(`${API_URL}/Ajustes/${idUsuario}?viewer=${viewer ?? ''}`);
    return response.json();
}

// Guarda uno o varios ajustes, ej. guardarAjustes(user.id, { mostrarInsignias: false })
export async function guardarAjustes(idUsuario, cambios) {
    const response = await fetch(`${API_URL}/Ajustes/${idUsuario}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idUsuario, ...cambios }),
    });
    return response.json();
}