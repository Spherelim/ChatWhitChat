const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Categorías (de aquí salen los filtros y los colores del mapa)
export async function getCategorias(signal){
    const response = await fetch(`${API_URL}/categorias`, { signal });
    return response.json();
}

// Lugares que caben en la zona visible del mapa.
//   zona   -> { minLat, maxLat, minLng, maxLng }
//   grupos -> ['comida', 'cultura'] o null para todos
export async function getLugares(zona, grupos = null, signal){
    // 5 decimales (~1 m) son de sobra y así las urls se repiten más (mejor para el caché)
    const redondear = (n) => Number(n.toFixed(5));

    const params = new URLSearchParams({
        minLat: redondear(zona.minLat),
        maxLat: redondear(zona.maxLat),
        minLng: redondear(zona.minLng),
        maxLng: redondear(zona.maxLng),
    });
    if(grupos?.length) params.set('grupos', grupos.join(','));

    const response = await fetch(`${API_URL}/lugares?${params}`, { signal });
    return response.json();
}