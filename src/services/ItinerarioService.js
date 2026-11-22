import { API_URL } from './postService.js';

// Le avisa a todos los que muestran itinerarios (lista, panel...) que algo cambió, para que se recarguen
export const avisarCambioItinerarios = () => window.dispatchEvent(new Event('itinerario:cambio'));

const json = (idUsuario, extra = {}) => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idUsuario, ...extra }),
});

// Mis itinerarios: [{ id, nombre, foto, completado, totalParadas }]
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

// { itinerario, paradas: [{ id, dia, hora, orden, lugar, agregadoPor }] }
export async function getItinerario(idItinerario) {
    const response = await fetch(`${API_URL}/Itinerarios/${idItinerario}`);
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