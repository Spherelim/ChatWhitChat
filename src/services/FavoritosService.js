import { useEffect, useSyncExternalStore } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from './postService.js';

// ---------- API ----------
// viewer = quién lo está pidiendo (si el dueño ocultó sus favoritos, solo él los ve)
export async function getFavoritosUsuario(idUsuario, viewer = null) {
    const response = await fetch(`${API_URL}/Favoritos/Usuario/${idUsuario}?viewer=${viewer ?? ''}`);
    return response.json();
}

// favorito = true (marcar) | false (quitar)
export async function setFavoritoLugar(idLugar, idUsuario, favorito) {
    const response = await fetch(`${API_URL}/Favoritos/${idLugar}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idUsuario, favorito }),
    });
    return response.json();
}

// ---------- Estado compartido ----------
// Guarda UNA sola vez los ids de mis lugares favoritos, para que todos los <VenueTag/>
// (mapa, itinerario, perfil...) sepan si su estrella va activa sin pedirlo cada uno.
let estado = { userId: null, ids: new Set(), cargado: false };
let cargandoPara = null;
const oyentes = new Set();

const cambiar = (parcial) => {
    estado = { ...estado, ...parcial }; // objeto nuevo = React se entera del cambio
    oyentes.forEach(fn => fn());
};
const suscribir = (fn) => { oyentes.add(fn); return () => oyentes.delete(fn); };
const leer = () => estado;

async function cargar(userId) {
    if (estado.userId === userId && (estado.cargado || cargandoPara === userId)) return;

    cargandoPara = userId;
    cambiar({ userId, ids: new Set(), cargado: false });

    try {
        const data = await getFavoritosUsuario(userId, userId);   // son MIS favoritos: siempre los puedo ver
        if (estado.userId !== userId) return; // cerró sesión / cambió de usuario mientras cargaba
        if (data.success) cambiar({ ids: new Set(data.lugares.map(l => Number(l.id))), cargado: true });
    } catch (err) {
        console.error('Error cargando favoritos:', err);
    } finally {
        if (cargandoPara === userId) cargandoPara = null;
    }
}

async function alternar(idLugar) {
    const userId = estado.userId;
    const id = Number(idLugar);
    if (!userId || !id) return; // sin sesión no se puede marcar

    const era = estado.ids.has(id);

    // La estrella cambia de inmediato...
    const copia = new Set(estado.ids);
    era ? copia.delete(id) : copia.add(id);
    cambiar({ ids: copia });

    try {
        const data = await setFavoritoLugar(id, userId, !era);
        if (!data.success) throw new Error(data.error);
    } catch (err) {
        // ...y si el servidor falló, regresa como estaba
        console.error(err);
        const revertida = new Set(estado.ids);
        era ? revertida.add(id) : revertida.delete(id);
        cambiar({ ids: revertida });
    }
}

// Uso:  const { esFavorito, alternar } = useFavoritos();
export function useFavoritos() {
    const { user } = useAuth();
    const snapshot = useSyncExternalStore(suscribir, leer);

    useEffect(() => {
        if (user?.id) cargar(user.id);
        else if (estado.userId) cambiar({ userId: null, ids: new Set(), cargado: false });
    }, [user?.id]);

    return {
        esFavorito: (id) => snapshot.ids.has(Number(id)),
        alternar,
    };
}