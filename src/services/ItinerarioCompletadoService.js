import { API_URL } from './postService.js';

// Marca o desmarca un itinerario como completado (cualquier integrante; cuenta para todos)
// -> { success, completado }
export async function marcarCompletado(idItinerario, idUsuario, completado) {
    const response = await fetch(`${API_URL}/Itinerarios/${idItinerario}/Completado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idUsuario, completado }),
    });
    return response.json();
}

// Cuántos itinerarios completados tiene un usuario (los suyos y a los que se unió) -> { success, total, oculto? }
// viewer = quién lo pide (si el dueño ocultó sus insignias, solo él las ve)
export async function getCompletados(idUsuario, viewer = null) {
    const response = await fetch(`${API_URL}/Itinerarios/Completados/${idUsuario}?viewer=${viewer ?? ''}`);
    return response.json();
}