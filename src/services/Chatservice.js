const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Las urls de archivos se guardan relativas ("/uploads/chat/xxx.png"): aquí se les pone el servidor.
// (las "blob:" son previews locales y las "http" ya vienen completas)
export function urlArchivo(url){
    if(!url) return '';
    if(url.startsWith('http') || url.startsWith('blob:')) return url;
    return `${API_URL}${url}`;
}

export const formatearHora = (fechaISO) =>
    new Date(fechaISO).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

// Abre (o crea) el chat privado con otro usuario -> { success, conversacionId }
export async function abrirConversacionPrivada(usuarioId, otroId){
    const response = await fetch(`${API_URL}/chat/privada`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuarioId, otroId })
    });
    return response.json();
}

// Historial de una conversación -> { success, mensajes, hayMas, participantes }
export async function getMensajes(conversacionId, usuarioId, antes = null){
    const params = new URLSearchParams({ usuarioId });
    if(antes) params.set('antes', antes);

    const response = await fetch(`${API_URL}/chat/${conversacionId}/mensajes?${params}`);
    return response.json();
}

// Sube un archivo -> { url, nombre, mime, size }. Lanza error si no se pudo.
export async function subirArchivo(file){
    const formData = new FormData();
    formData.append('archivo', file);

    // Sin "Content-Type": el navegador lo pone solo (con el boundary del multipart)
    const response = await fetch(`${API_URL}/chat/upload`, { method: "POST", body: formData });
    const data = await response.json();

    if(!data.success) throw new Error(data.error || 'No se pudo subir el archivo');
    return data.archivo;
}

// Mensaje del servidor -> el formato que usa el componente <Message>
export function mensajeAUI(m, miId, visto = false){
    const own = m.remitenteId === miId;

    return {
        key: m.id,
        id: m.id,
        type: m.tipo,
        ...m.contenido,                 // url, nombre, mime, size, lat, lng, foto...
        text: m.contenido?.texto,
        clock: formatearHora(m.fecha),
        own,
        status: own ? (visto ? 'seen' : 'sent') : undefined,
    };
}