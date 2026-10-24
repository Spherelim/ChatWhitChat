import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Una sola conexión para toda la app (no una por componente).
let socket = null;
let usuarioConectado = null;

// Conecta (o reutiliza la conexión si ya es del mismo usuario)
export function conectarSocket(usuarioId){
    if(socket && usuarioConectado === usuarioId) return socket;

    if(socket) socket.disconnect();

    usuarioConectado = usuarioId;
    // OJO: por ahora el id va tal cual (igual que en el follow). Cuando haya JWT, aquí se manda el token.
    socket = io(API_URL, { auth: { usuarioId } });

    return socket;
}

export const getSocket = () => socket;

// Llamar al cerrar sesión
export function desconectarSocket(){
    socket?.disconnect();
    socket = null;
    usuarioConectado = null;
}