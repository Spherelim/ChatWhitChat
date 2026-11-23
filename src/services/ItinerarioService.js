import { API_URL } from './postService.js';

// Le avisa a todos los que muestran itinerarios (lista, panel...) que algo cambió, para que se recarguen
export const avisarCambioItinerarios = () => window.dispatchEvent(new Event('itinerario:cambio'));

const json = (idUsuario, extra = {}) => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idUsuario, ...extra }),
});

// Mis itinerarios (los míos y a los que me uní): [{ id, nombre, foto, completado, totalParadas, totalIntegrantes, esDuenio }]
export async function getItinerarios(idUsuario) {
    const response = await fetch(`${API_URL}/Itinerarios/Usuario/${idUsuario}`);
    return response.json();
}

export async function crearItinerario(idUsuario, nombre = 'Nuevo Itinerario') {
    const response = await fetch(`${API_URL}/Itinerarios`, json(idUsuario, { nombre }));
    return response.json();
}

export async function eliminarItinerario(idItinerario, idUsuario) {
    const response = await fetch(`${API_URL}/Itinerarios/${idItinerario}?idUsuario=${idUsuario}`, { method: 'DELETE' });
    return response.json();
}

// { itinerario, integrantes, ultimaModificacion, paradas: [{ id, dia, hora, orden, lugar, agregadoPor }] }
// Solo lo pueden abrir los integrantes (por eso se manda quién lo pide)
export async function getItinerario(idItinerario, idUsuario) {
    const response = await fetch(`${API_URL}/Itinerarios/${idItinerario}?viewer=${idUsuario ?? ''}`);
    return response.json();
}

// Para la tarjeta del chat: nombre/foto actuales + si yo ya soy integrante
// -> { existe, esIntegrante, itinerario: { id, nombre, foto, totalIntegrantes } }
export async function getResumenItinerario(idItinerario, idUsuario) {
    const response = await fetch(`${API_URL}/Itinerarios/${idItinerario}/Resumen?viewer=${idUsuario ?? ''}`);
    return response.json();
}

// "+ Unirse" del mensaje del chat
export async function unirseItinerario(idItinerario, idUsuario) {
    const response = await fetch(`${API_URL}/Itinerarios/${idItinerario}/Unirse`, json(idUsuario));
    return response.json();
}

// Botón "Agregar +" de un VenueTag
export async function agregarParada(idItinerario, idUsuario, idLugar) {
    const response = await fetch(`${API_URL}/Itinerarios/${idItinerario}/Paradas`, json(idUsuario, { idLugar }));
    return response.json();
}

export async function quitarParada(idItinerario, idParada, idUsuario) {
    const response = await fetch(`${API_URL}/Itinerarios/${idItinerario}/Paradas/${idParada}?idUsuario=${idUsuario}`, { method: 'DELETE' });
    return response.json();
}

// Guarda la edición completa.
//   foto    = Blob ya recortado/comprimido (o null si no cambió)
//   paradas = [{ id, dia, hora }] en el orden nuevo
//   quitar  = [idParada] que el usuario eliminó en el modo edición
export async function guardarItinerario(idItinerario, { idUsuario, nombre, foto = null, paradas = [], quitar = [] }) {
    const form = new FormData();
    form.append('idUsuario', idUsuario);
    form.append('nombre', nombre);
    form.append('paradas', JSON.stringify(paradas));
    form.append('quitar', JSON.stringify(quitar));
    if (foto) form.append('foto', foto, 'itinerario.webp');

    // Con FormData NO se pone Content-Type, el navegador agrega el boundary solo
    const response = await fetch(`${API_URL}/Itinerarios/${idItinerario}`, { method: 'PUT', body: form });
    return response.json();
}