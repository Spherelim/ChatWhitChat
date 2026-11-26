import { Server } from "socket.io";

import { registrarLlamadas } from "./Llamadas.js";
import { guardarMensaje, marcarLeido, entero, ErrorChat, registrarIO } from "./ChatCore.js";

// Mensajes en tiempo real con Socket.IO.
//
// Cada usuario conectado se mete a su "sala personal" (usuario:<id>). Cuando llega un mensaje,
// el servidor lo guarda (cifrado) y se lo manda a la sala personal de cada participante.
// Así funciona igual para chats privados y grupos, y también si el usuario tiene varias
// pestañas/dispositivos abiertos, sin tener que andar uniendo salas a mano.
//
// Eventos que ESCUCHA el servidor (los manda el cliente):
//   "mensaje:enviar"     { conversacionId, tipo, contenido }   -> responde con ack { ok, mensaje | error }
//   "conversacion:leida" { conversacionId, hastaId }
//
// Eventos que EMITE el servidor:
//   "mensaje:nuevo"      <mensaje>                             -> a los demás participantes (y a mis otras pestañas)
//   "conversacion:leida" { conversacionId, lectorId, hastaId } -> para pintar los "visto"
//   "conversacion:nueva" { conversacionId }                    -> te agregaron a un grupo (la lista se recarga)
//   "presencia:cambio"   { usuarioId, enLinea }                -> alguien se conectó / desconectó
//
// Presencia: "en línea" = tiene al menos 1 socket abierto (pestañas, dispositivos). Vive en memoria del
// servidor, así que al cerrar la pestaña, salir de la página o cerrar sesión pasa a "Desconectado" solo.
//   "presencia:consultar" { ids } -> ack { ok, enLinea: [ids] }

// usuarioId -> cuántos sockets tiene abiertos
const conexiones = new Map();
const pendientesDesconexion = new Map();

// Al cambiar de página el socket se cierra y se vuelve a abrir en un instante: se espera un poco
// antes de avisar "desconectado" para que no parpadee.
const GRACIA_MS = 4000;

export function iniciarSocket(httpServer){
    const origenes = (process.env.CLIENT_URL || "http://localhost:5173")
        .split(",").map(o => o.trim());

    const io = new Server(httpServer, {
        cors: { origin: origenes, credentials: true },
    });

    registrarIO(io);

    // -------- Identidad --------
    // OJO: por ahora el id lo manda el cliente (igual que el "seguidorId" del follow), o sea que
    // alguien podría hacerse pasar por otro usuario. Cuando metas JWT/sesión, ESTE es el único lugar
    // que hay que cambiar: validar el token aquí y sacar el id de ahí, no de socket.handshake.auth.
    io.use((socket, next) => {
        const usuarioId = entero(socket.handshake.auth?.usuarioId);
        if(!usuarioId) return next(new Error("Falta usuarioId"));

        socket.data.usuarioId = usuarioId;
        next();
    });

    io.on("connection", (socket) => {
        const usuarioId = socket.data.usuarioId;
        socket.join(`usuario:${usuarioId}`);

        registrarLlamadas(io, socket);   // llamadas y videollamadas (ver Llamadas.js), por favor.

        // ---------- Presencia ----------
        clearTimeout(pendientesDesconexion.get(usuarioId));
        pendientesDesconexion.delete(usuarioId);

        const antes = conexiones.get(usuarioId) ?? 0;
        conexiones.set(usuarioId, antes + 1);
        if(antes === 0) io.emit("presencia:cambio", { usuarioId, enLinea: true });

        socket.on("presencia:consultar", (datos, ack) => {
            if(typeof ack !== "function") return;
            const ids = (Array.isArray(datos?.ids) ? datos.ids : []).slice(0, 500).map(entero).filter(Boolean);
            ack({ ok: true, enLinea: ids.filter(id => (conexiones.get(id) ?? 0) > 0) });
        });

        socket.on("disconnect", () => {
            const restantes = (conexiones.get(usuarioId) ?? 1) - 1;
            if(restantes > 0) return void conexiones.set(usuarioId, restantes);

            const espera = setTimeout(() => {
                pendientesDesconexion.delete(usuarioId);
                if(restantes <= 0 && !pendientesDesconexion.has(usuarioId) && (conexiones.get(usuarioId) ?? 0) <= 0){
                    conexiones.delete(usuarioId);
                    io.emit("presencia:cambio", { usuarioId, enLinea: false });
                }
            }, GRACIA_MS);
            conexiones.set(usuarioId, 0);
            pendientesDesconexion.set(usuarioId, espera);
        });

        // ---------- Enviar mensaje ----------
        socket.on("mensaje:enviar", async (datos, ack) => {
            const responder = typeof ack === "function" ? ack : () => {};

            try{
                const conversacionId = entero(datos?.conversacionId);
                if(!conversacionId) throw new ErrorChat("Falta conversacionId");

                const { mensaje, participantes } = await guardarMensaje({
                    conversacionId,
                    remitenteId: usuarioId,
                    tipo: datos?.tipo,
                    contenido: datos?.contenido,
                });

                // A todos los participantes, MENOS a este socket (a él le llega el ack).
                // Mis otras pestañas/dispositivos sí lo reciben porque están en mi sala personal.
                socket.to(participantes.map(id => `usuario:${id}`)).emit("mensaje:nuevo", mensaje);

                responder({ ok: true, mensaje });
            }
            catch(err){
                if(!(err instanceof ErrorChat)) console.error("Error al enviar mensaje:", err);
                responder({ ok: false, error: err instanceof ErrorChat ? err.message : "No se pudo enviar el mensaje" });
            }
        });

        // ---------- Marcar como leído ----------
        socket.on("conversacion:leida", async (datos, ack) => {
            const responder = typeof ack === "function" ? ack : () => {};

            try{
                const conversacionId = entero(datos?.conversacionId);
                const hastaId = entero(datos?.hastaId);
                if(!conversacionId || !hastaId) throw new ErrorChat("Faltan conversacionId y hastaId");

                const resultado = await marcarLeido({ conversacionId, usuarioId, hastaId });

                io.to(resultado.participantes.map(id => `usuario:${id}`)).emit("conversacion:leida", {
                    conversacionId,
                    lectorId: usuarioId,
                    hastaId: resultado.hastaId,
                });

                responder({ ok: true });
            }
            catch(err){
                if(!(err instanceof ErrorChat)) console.error("Error al marcar leído:", err);
                responder({ ok: false, error: err instanceof ErrorChat ? err.message : "No se pudo marcar como leído" });
            }
        });
    });

    return io;
}