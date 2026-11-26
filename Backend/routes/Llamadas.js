import crypto from "crypto";

import { query, entero, idsParticipantes, ErrorChat } from "./ChatCore.js";
import { urlPublica } from "../utils/urlPublica.js";

// Llamadas y videollamadas (WebRTC peer-to-peer).
//
// El servidor NO toca el audio ni el video: solo hace de "señalización" (avisa que alguien llama,
// quién contestó y pasa las ofertas/respuestas/candidatos ICE entre los navegadores). El audio y el video
// viajan directo de un navegador a otro. En un grupo cada quien se conecta con cada quien (malla),
// por eso hay un máximo de personas en la llamada.
//
// Eventos que ESCUCHA el servidor (todos con ack { ok, ... } o { ok:false, error }):
//   "llamada:iniciar"  { conversacionId, tipo: 'audio'|'video' }  -> crea la llamada, o se une si ya hay una en ese chat
//   "llamada:aceptar"  { llamadaId }
//   "llamada:rechazar" { llamadaId }
//   "llamada:senal"    { llamadaId, para, datos }                 -> datos = { sdp } o { ice }
//   "llamada:estado"   { llamadaId, mic, cam }                    -> para mostrar "silenciado" / cámara apagada
//   "llamada:salir"    { llamadaId }
//
// Eventos que EMITE:
//   "llamada:entrante"  { llamadaId, conversacionId, tipo, grupo, nombre, de }   -> a los invitados
//   "llamada:atendida"  { llamadaId }                                            -> a mis otras pestañas (cierran el timbre)
//   "llamada:cancelada" { llamadaId }                                            -> al invitado (ya nadie llama)
//   "llamada:unido"     { llamadaId, usuario }   |  "llamada:salio" { llamadaId, usuarioId }
//   "llamada:rechazada" { llamadaId, usuarioId }
//   "llamada:senal"     { llamadaId, de, datos }
//   "llamada:estado"    { llamadaId, usuarioId, mic, cam }
//   "llamada:terminada" { llamadaId, motivo }    -> motivo: 'finalizada' | 'cancelada' | 'rechazada' | 'sin-respuesta'

const MAX_EN_LLAMADA = 6;       // en malla cada persona manda su video a todas las demás
const TIMBRE_MS = 45_000;       // cuánto suena antes de rendirse

const llamadas = new Map();         // llamadaId -> llamada
const llamadaDeConv = new Map();    // conversacionId -> llamadaId (solo una llamada activa por chat)

async function infoUsuarios(ids, socket){
    if(ids.length === 0) return [];

    // urlPublica necesita una "petición" para saber el host: se arma con la del handshake del socket
    const req = {
        protocol: socket.handshake.secure ? "https" : "http",
        get: () => socket.handshake.headers.host,
    };

    const filas = await query("SELECT id, Nombre_De_Usuario, Foto FROM V_Usuarios WHERE id IN (?)", [ids]);
    return filas.map(u => ({ id: u.id, username: u.Nombre_De_Usuario, foto: urlPublica(u.Foto, req) }));
}

export function registrarLlamadas(io, socket){
    const yo = socket.data.usuarioId;
    const sala = (id) => `llamada:${id}`;

    // Cierra la llamada para todos
    function terminar(llamada, motivo){
        clearTimeout(llamada.timbre);
        llamadas.delete(llamada.id);
        if(llamadaDeConv.get(llamada.conversacionId) === llamada.id) llamadaDeConv.delete(llamada.conversacionId);

        for(const socketId of llamada.participantes.values()){
            const s = io.sockets.sockets.get(socketId);
            if(s){
                s.leave(sala(llamada.id));
                s.data.llamadaId = null;
            }
            io.to(socketId).emit("llamada:terminada", { llamadaId: llamada.id, motivo });
        }
        llamada.participantes.clear();

        for(const id of llamada.pendientes) io.to(`usuario:${id}`).emit("llamada:cancelada", { llamadaId: llamada.id });
        llamada.pendientes.clear();
    }

    // Yo salgo de la llamada
    function salir(llamada){
        if(!llamada || llamada.participantes.get(yo) !== socket.id) return;

        llamada.participantes.delete(yo);
        socket.leave(sala(llamada.id));
        socket.data.llamadaId = null;

        if(llamada.participantes.size === 0) return terminar(llamada, "cancelada");

        io.to(sala(llamada.id)).emit("llamada:salio", { llamadaId: llamada.id, usuarioId: yo });

        // Si solo queda 1 persona y a nadie más le está sonando, ya no hay con quién hablar
        if(llamada.participantes.size === 1 && llamada.pendientes.size === 0) terminar(llamada, "finalizada");
    }

    // Me uno a una llamada (porque contesté, o porque marqué en un chat que ya tenía llamada)
    async function unir(llamada){
        if(llamada.participantes.has(yo)) throw new ErrorChat("Ya estás en esta llamada");
        if(llamada.participantes.size >= MAX_EN_LLAMADA) throw new ErrorChat(`La llamada está llena (máximo ${MAX_EN_LLAMADA})`);

        const [miembros, [miInfo]] = await Promise.all([
            infoUsuarios([...llamada.participantes.keys()], socket),
            infoUsuarios([yo], socket),
        ]);

        // Pudo terminar mientras se consultaba la BD
        if(!llamadas.has(llamada.id)) throw new ErrorChat("La llamada ya terminó");

        llamada.pendientes.delete(yo);
        socket.to(sala(llamada.id)).emit("llamada:unido", { llamadaId: llamada.id, usuario: miInfo });

        llamada.participantes.set(yo, socket.id);
        socket.join(sala(llamada.id));
        socket.data.llamadaId = llamada.id;

        // mis otras pestañas dejan de sonar
        io.to(`usuario:${yo}`).emit("llamada:atendida", { llamadaId: llamada.id });

        return { ok: true, llamadaId: llamada.id, tipo: llamada.tipo, grupo: llamada.grupo, miembros };
    }

    const manejar = (fn) => async (datos, ack) => {
        const responder = typeof ack === "function" ? ack : () => {};
        try{
            responder(await fn(datos ?? {}) ?? { ok: true });
        }
        catch(err){
            if(!(err instanceof ErrorChat)) console.error("Error en llamada:", err);
            responder({ ok: false, error: err instanceof ErrorChat ? err.message : "No se pudo realizar la llamada" });
        }
    };

    socket.on("llamada:iniciar", manejar(async (datos) => {
        if(socket.data.llamadaId) throw new ErrorChat("Ya estás en una llamada");

        const conversacionId = entero(datos.conversacionId);
        if(!conversacionId) throw new ErrorChat("Falta conversacionId");

        const participantes = await idsParticipantes(conversacionId);
        if(!participantes.includes(yo)) throw new ErrorChat("No perteneces a esta conversación", 403);

        const existente = () => llamadas.get(llamadaDeConv.get(conversacionId));

        // Si ese chat ya tiene llamada en curso, me uno en vez de crear otra
        if(existente()) return unir(existente());

        if(participantes.length > MAX_EN_LLAMADA){
            throw new ErrorChat(`Las llamadas grupales son de máximo ${MAX_EN_LLAMADA} personas`);
        }

        const [[conv], [de]] = await Promise.all([
            query("SELECT Tipo, Nombre FROM Conversacion WHERE ID_Conversacion = ?", [conversacionId]),
            infoUsuarios([yo], socket),
        ]);
        if(!conv) throw new ErrorChat("La conversación no existe", 404);

        // Otra persona pudo crearla mientras tanto
        if(existente()) return unir(existente());

        const llamada = {
            id: crypto.randomUUID(),
            conversacionId,
            tipo: datos.tipo === "video" ? "video" : "audio",
            grupo: conv.Tipo === "grupo",
            nombre: conv.Nombre,
            participantes: new Map([[yo, socket.id]]),      // userId -> socket.id (el que está en la llamada)
            pendientes: new Set(participantes.filter(id => id !== yo)),   // a quienes les está sonando
            timbre: null,
        };

        llamadas.set(llamada.id, llamada);
        llamadaDeConv.set(conversacionId, llamada.id);
        socket.join(sala(llamada.id));
        socket.data.llamadaId = llamada.id;

        io.to([...llamada.pendientes].map(id => `usuario:${id}`)).emit("llamada:entrante", {
            llamadaId: llamada.id,
            conversacionId,
            tipo: llamada.tipo,
            grupo: llamada.grupo,
            nombre: llamada.nombre,
            de,
        });

        // Si nadie contesta, se corta el timbre
        llamada.timbre = setTimeout(() => {
            if(!llamadas.has(llamada.id)) return;

            if(llamada.participantes.size <= 1) return terminar(llamada, "sin-respuesta");

            // en un grupo la llamada sigue con los que sí contestaron
            for(const id of llamada.pendientes) io.to(`usuario:${id}`).emit("llamada:cancelada", { llamadaId: llamada.id });
            llamada.pendientes.clear();
        }, TIMBRE_MS);

        return { ok: true, llamadaId: llamada.id, tipo: llamada.tipo, grupo: llamada.grupo, miembros: [] };
    }));

    socket.on("llamada:aceptar", manejar(async (datos) => {
        if(socket.data.llamadaId) throw new ErrorChat("Ya estás en una llamada");

        const llamada = llamadas.get(datos.llamadaId);
        if(!llamada || !llamada.pendientes.has(yo)) throw new ErrorChat("La llamada ya terminó");

        return unir(llamada);
    }));

    socket.on("llamada:rechazar", manejar(async (datos) => {
        const llamada = llamadas.get(datos.llamadaId);
        if(!llamada || !llamada.pendientes.has(yo)) return { ok: true };

        llamada.pendientes.delete(yo);
        io.to(`usuario:${yo}`).emit("llamada:atendida", { llamadaId: llamada.id });   // cierra el timbre en mis otras pestañas
        io.to(sala(llamada.id)).emit("llamada:rechazada", { llamadaId: llamada.id, usuarioId: yo });

        if(llamada.participantes.size <= 1 && llamada.pendientes.size === 0) terminar(llamada, "rechazada");
        return { ok: true };
    }));

    // Pasa tal cual lo que se mandan los navegadores para conectarse entre sí
    socket.on("llamada:senal", (datos) => {
        const llamada = llamadas.get(datos?.llamadaId);
        if(!llamada || llamada.participantes.get(yo) !== socket.id) return;

        const destino = llamada.participantes.get(entero(datos.para));
        if(!destino || typeof datos.datos !== "object" || datos.datos === null) return;

        io.to(destino).emit("llamada:senal", { llamadaId: llamada.id, de: yo, datos: datos.datos });
    });

    socket.on("llamada:estado", (datos) => {
        const llamada = llamadas.get(datos?.llamadaId);
        if(!llamada || llamada.participantes.get(yo) !== socket.id) return;

        socket.to(sala(llamada.id)).emit("llamada:estado", {
            llamadaId: llamada.id,
            usuarioId: yo,
            mic: !!datos.mic,
            cam: !!datos.cam,
        });
    });

    socket.on("llamada:salir", manejar(async (datos) => {
        salir(llamadas.get(datos.llamadaId));
        return { ok: true };
    }));

    // Cerró la pestaña / se cayó el internet (o lo que haya pasado): sale de la llamada
    socket.on("disconnect", () => salir(llamadas.get(socket.data.llamadaId)));
}