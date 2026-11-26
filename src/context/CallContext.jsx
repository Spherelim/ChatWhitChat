import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

import Call from '../includes/Call';
import LlamadaEntrante from '../includes/LlamadaEntrante';

import { useAuth } from './AuthContext.jsx';
import { conectarSocket, getSocket } from '../services/Socket.js';

const CallContext = createContext(null);

// Servidores para que los navegadores se encuentren entre sí (STUN público de Google).
// Detrás de algunas redes muy cerradas (ej. datos móviles, ciertos WiFi de empresa) hace falta un servidor TURN.
const ICE_SERVERS = (() => {
    try{
        const lista = JSON.parse(import.meta.env.VITE_ICE_SERVERS);
        if(Array.isArray(lista) && lista.length) return lista;
    }
    catch{ /* sin configurar: se usan los de abajo */ }
    return [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
})();

const MOTIVOS = {
    'sin-respuesta': 'No contestó',
    rechazada: 'Llamada rechazada',
    cancelada: 'Llamada cancelada',
    finalizada: 'Llamada finalizada',
};

// socket.emit con promesa
function emitir(evento, datos){
    return new Promise((resolve, reject) => {
        const socket = getSocket();
        if(!socket) return reject(new Error('Sin conexión con el servidor'));

        socket.timeout(10000).emit(evento, datos, (err, res) => {
            if(err) return reject(new Error('El servidor no respondió'));
            if(!res?.ok) return reject(new Error(res?.error || 'No se pudo realizar la llamada'));
            resolve(res);
        });
    });
}

// Cámara + micrófono. Si la cámara falla en una videollamada, se entra solo con audio.
async function obtenerMedios(tipo){
    if(!navigator.mediaDevices?.getUserMedia){
        throw new Error('Tu navegador no permite usar micrófono/cámara aquí (necesita HTTPS o localhost)');
    }

    try{
        return await navigator.mediaDevices.getUserMedia({ audio: true, video: tipo === 'video' });
    }
    catch(err){
        if(tipo === 'video'){
            try{ return await navigator.mediaDevices.getUserMedia({ audio: true }); }
            catch{ /* cae al error de abajo */ }
        }
        throw new Error(err?.name === 'NotAllowedError'
            ? 'Permiso de micrófono/cámara denegado'
            : 'No se pudo acceder al micrófono');
    }
}

export function CallProvider({ children }) {
    const { user } = useAuth();
    const miId = user?.id;

    // Se guarda en state (para pintar) Y en ref (para que los eventos del socket lean siempre el valor actual)
    const [activeCall, setActivaState] = useState(null);   // llamada en curso / marcando
    const [entrante, setEntranteState] = useState(null);   // alguien me está llamando
    const activaRef = useRef(null);
    const entranteRef = useRef(null);

    const setActiva = useCallback((valor) => {
        const nuevo = typeof valor === 'function' ? valor(activaRef.current) : valor;
        activaRef.current = nuevo;
        setActivaState(nuevo);
    }, []);

    const setEntrante = useCallback((valor) => {
        entranteRef.current = valor;
        setEntranteState(valor);
    }, []);

    const [remotos, setRemotos] = useState({});            // userId -> { id, username, foto, stream, mic, cam }
    const [localStream, setLocalStream] = useState(null);
    const [mic, setMic] = useState(true);
    const [cam, setCam] = useState(false);

    const pcsRef = useRef(new Map());                      // userId -> { pc, ice: [], remotaLista }
    const localRef = useRef(null);
    const cierreRef = useRef(null);

    // ---------- Limpieza ----------
    const liberarMedios = useCallback(() => {
        pcsRef.current.forEach(({ pc }) => {
            pc.onicecandidate = null;
            pc.ontrack = null;
            pc.onconnectionstatechange = null;
            pc.close();
        });
        pcsRef.current.clear();

        localRef.current?.getTracks().forEach(t => t.stop());
        localRef.current = null;

        setLocalStream(null);
        setRemotos({});
    }, []);

    const limpiar = useCallback(() => {
        clearTimeout(cierreRef.current);
        liberarMedios();
        setActiva(null);
        setMic(true);
        setCam(false);
    }, [liberarMedios, setActiva]);

    // Muestra un mensaje ("Llamada finalizada", "No contestó"...) un momento y cierra
    const finalizar = useCallback((texto) => {
        if(!activaRef.current) return;

        liberarMedios();
        setActiva(a => a && { ...a, estado: 'terminada', texto });

        clearTimeout(cierreRef.current);
        cierreRef.current = setTimeout(limpiar, 2000);
    }, [liberarMedios, limpiar, setActiva]);

    // ---------- WebRTC ----------
    const mandarSenal = (para, datos) => {
        getSocket()?.emit('llamada:senal', { llamadaId: activaRef.current?.llamadaId, para, datos });
    };

    const ponerEnCurso = () => {
        setActiva(a => (a && a.estado !== 'en-curso' && a.estado !== 'terminada')
            ? { ...a, estado: 'en-curso', inicio: Date.now() }
            : a);
    };

    const crearPeer = useCallback((remotoId) => {
        const existente = pcsRef.current.get(remotoId);
        if(existente) return existente;

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        const entrada = { pc, ice: [], remotaLista: false };

        localRef.current?.getTracks().forEach(t => pc.addTrack(t, localRef.current));

        pc.onicecandidate = (e) => {
            if(e.candidate) mandarSenal(remotoId, { ice: e.candidate });
        };

        pc.ontrack = (e) => {
            const stream = e.streams[0];
            if(!stream) return;
            setRemotos(prev => ({ ...prev, [remotoId]: { id: remotoId, ...prev[remotoId], stream } }));
        };

        pc.onconnectionstatechange = () => {
            if(pc.connectionState === 'connected') ponerEnCurso();

            if(pc.connectionState === 'failed'){
                setRemotos(prev => prev[remotoId] ? { ...prev, [remotoId]: { ...prev[remotoId], fallo: true } } : prev);
            }
        };

        pcsRef.current.set(remotoId, entrada);
        return entrada;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const quitarPeer = useCallback((remotoId) => {
        const entrada = pcsRef.current.get(remotoId);
        if(entrada){
            entrada.pc.close();
            pcsRef.current.delete(remotoId);
        }
        setRemotos(prev => {
            const { [remotoId]: _, ...resto } = prev;
            return resto;
        });
    }, []);

    // El que llega nuevo es quien manda la oferta a los que ya estaban
    const ofrecer = useCallback(async (remotoId) => {
        const { pc } = crearPeer(remotoId);
        const oferta = await pc.createOffer();
        await pc.setLocalDescription(oferta);
        mandarSenal(remotoId, { sdp: pc.localDescription });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [crearPeer]);

    const registrarPersonas = useCallback((personas) => {
        setRemotos(prev => {
            const nuevo = { ...prev };
            personas.forEach(p => { nuevo[p.id] = { ...nuevo[p.id], ...p, mic: nuevo[p.id]?.mic ?? true, cam: nuevo[p.id]?.cam ?? true }; });
            return nuevo;
        });
    }, []);

    // Prepara micrófono/cámara y los deja listos para agregarse a las conexiones
    const prepararMedios = useCallback(async (tipo) => {
        const stream = await obtenerMedios(tipo);

        // Colgaron mientras se pedía el permiso
        if(!activaRef.current){
            stream.getTracks().forEach(t => t.stop());
            throw new Error('Llamada cancelada');
        }

        localRef.current = stream;
        setLocalStream(stream);
        setMic(true);
        setCam(stream.getVideoTracks().length > 0);
    }, []);

    // Tras unirme: me conecto con cada persona que ya estaba
    const conectarConMiembros = useCallback(async (res) => {
        setActiva(a => a && {
            ...a,
            llamadaId: res.llamadaId,
            tipo: res.tipo,
            estado: res.miembros.length > 0 ? 'conectando' : 'llamando',
        });

        registrarPersonas(res.miembros);
        for(const m of res.miembros) await ofrecer(m.id);
    }, [ofrecer, registrarPersonas, setActiva]);

    // ---------- Acciones de la interfaz ----------

    // contact: { conversacionId, username, avatar, esGrupo?, avatars? }
    const startCall = useCallback(async (contact, callType = 'audio') => {
        if(!miId || activaRef.current || entranteRef.current) return;

        if(!contact?.conversacionId){
            console.error('startCall: falta conversacionId');
            return;
        }

        conectarSocket(miId);

        setActiva({
            llamadaId: null,
            conversacionId: contact.conversacionId,
            tipo: callType,
            grupo: !!contact.esGrupo,
            nombre: contact.username,
            avatar: contact.avatar,
            avatars: contact.avatars ?? (contact.miembros ? contact.miembros.map(m => m.foto) : null),
            estado: 'llamando',
        });

        try{
            await prepararMedios(callType);
            const res = await emitir('llamada:iniciar', { conversacionId: contact.conversacionId, tipo: callType });

            // Si ya había llamada en ese chat me uní a ella: llegó con su tipo real
            if(res.tipo === 'audio') { localRef.current?.getVideoTracks().forEach(t => { t.stop(); localRef.current.removeTrack(t); }); setCam(false); }
            await conectarConMiembros(res);
        }
        catch(err){
            console.error('Llamada:', err);
            finalizar(err.message);
        }
    }, [miId, setActiva, prepararMedios, conectarConMiembros, finalizar]);

    const aceptarEntrante = useCallback(async () => {
        const e = entranteRef.current;
        if(!e || activaRef.current) return;

        setEntrante(null);
        setActiva({
            llamadaId: null,
            conversacionId: e.conversacionId,
            tipo: e.tipo,
            grupo: e.grupo,
            nombre: e.grupo ? e.nombre : e.de.username,
            avatar: e.de.foto,
            estado: 'conectando',
        });

        try{
            await prepararMedios(e.tipo);
            const res = await emitir('llamada:aceptar', { llamadaId: e.llamadaId });
            await conectarConMiembros(res);
        }
        catch(err){
            console.error('Llamada:', err);
            finalizar(err.message);
        }
    }, [setEntrante, setActiva, prepararMedios, conectarConMiembros, finalizar]);

    const rechazarEntrante = useCallback(() => {
        const e = entranteRef.current;
        if(!e) return;

        getSocket()?.emit('llamada:rechazar', { llamadaId: e.llamadaId });
        setEntrante(null);
    }, [setEntrante]);

    const endCall = useCallback(() => {
        const a = activaRef.current;
        if(a?.llamadaId) getSocket()?.emit('llamada:salir', { llamadaId: a.llamadaId });
        limpiar();
    }, [limpiar]);

    const avisarEstado = (micOn, camOn) => {
        const a = activaRef.current;
        if(a?.llamadaId) getSocket()?.emit('llamada:estado', { llamadaId: a.llamadaId, mic: micOn, cam: camOn });
    };

    const toggleMic = () => {
        const pistas = localRef.current?.getAudioTracks() ?? [];
        if(pistas.length === 0) return;

        const nuevo = !pistas[0].enabled;
        pistas.forEach(t => { t.enabled = nuevo; });
        setMic(nuevo);
        avisarEstado(nuevo, cam);
    };

    const toggleCam = () => {
        const pistas = localRef.current?.getVideoTracks() ?? [];
        if(pistas.length === 0) return;

        const nuevo = !pistas[0].enabled;
        pistas.forEach(t => { t.enabled = nuevo; });
        setCam(nuevo);
        avisarEstado(mic, nuevo);
    };

    // ---------- Eventos del servidor ----------
    useEffect(() => {
        if(!miId) return;

        const socket = conectarSocket(miId);
        const esMia = (id) => activaRef.current?.llamadaId === id;

        const alEntrar = (d) => {
            // Ya estoy en otra llamada (o ya me llaman): contesto "ocupado" rechazando
            if(activaRef.current || entranteRef.current){
                socket.emit('llamada:rechazar', { llamadaId: d.llamadaId });
                return;
            }
            setEntrante(d);
        };

        // Mi otra pestaña contestó/rechazó, o el que llamaba ya colgó: se quita el aviso
        const cerrarAviso = (d) => {
            if(entranteRef.current?.llamadaId === d.llamadaId) setEntrante(null);
        };

        const alUnirse = ({ llamadaId, usuario }) => {
            if(!esMia(llamadaId)) return;
            registrarPersonas([usuario]);
            crearPeer(usuario.id);      // él me manda la oferta
        };

        const alSalir = ({ llamadaId, usuarioId }) => {
            if(esMia(llamadaId)) quitarPeer(usuarioId);
        };

        const alTerminar = ({ llamadaId, motivo }) => {
            if(esMia(llamadaId)) finalizar(MOTIVOS[motivo] || 'Llamada finalizada');
        };

        const alCambiarEstado = ({ llamadaId, usuarioId, mic: micOn, cam: camOn }) => {
            if(!esMia(llamadaId)) return;
            setRemotos(prev => prev[usuarioId] ? { ...prev, [usuarioId]: { ...prev[usuarioId], mic: micOn, cam: camOn } } : prev);
        };

        const alSenal = async ({ llamadaId, de, datos }) => {
            if(!esMia(llamadaId)) return;

            const entrada = crearPeer(de);
            const { pc } = entrada;

            try{
                if(datos.sdp){
                    await pc.setRemoteDescription(datos.sdp);
                    entrada.remotaLista = true;

                    for(const c of entrada.ice.splice(0)) await pc.addIceCandidate(c).catch(() => {});

                    if(datos.sdp.type === 'offer'){
                        const respuesta = await pc.createAnswer();
                        await pc.setLocalDescription(respuesta);
                        mandarSenal(de, { sdp: pc.localDescription });
                    }
                }
                else if(datos.ice){
                    // los candidatos pueden llegar antes que la oferta: se guardan hasta poder usarlos
                    if(entrada.remotaLista) await pc.addIceCandidate(datos.ice).catch(() => {});
                    else entrada.ice.push(datos.ice);
                }
            }
            catch(err){
                console.error('Error de señalización:', err);
            }
        };

        // Si se cae mi conexión con el servidor, la llamada ya no se puede sostener
        const alDesconectar = () => {
            if(activaRef.current?.llamadaId) finalizar('Se perdió la conexión');
            setEntrante(null);
        };

        socket.on('llamada:entrante', alEntrar);
        socket.on('llamada:atendida', cerrarAviso);
        socket.on('llamada:cancelada', cerrarAviso);
        socket.on('llamada:unido', alUnirse);
        socket.on('llamada:salio', alSalir);
        socket.on('llamada:terminada', alTerminar);
        socket.on('llamada:estado', alCambiarEstado);
        socket.on('llamada:senal', alSenal);
        socket.on('disconnect', alDesconectar);

        return () => {
            socket.off('llamada:entrante', alEntrar);
            socket.off('llamada:atendida', cerrarAviso);
            socket.off('llamada:cancelada', cerrarAviso);
            socket.off('llamada:unido', alUnirse);
            socket.off('llamada:salio', alSalir);
            socket.off('llamada:terminada', alTerminar);
            socket.off('llamada:estado', alCambiarEstado);
            socket.off('llamada:senal', alSenal);
            socket.off('disconnect', alDesconectar);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [miId]);

    return (
        <CallContext.Provider value={{ activeCall, startCall, endCall }}>
            {children}

            {/* Se renderiza aquí, arriba de las Routes, así no se desmonta
                cuando el usuario navega entre páginas (Menu, Friends, Mapa...). */}
            {entrante && !activeCall && (
                <LlamadaEntrante
                    llamada={entrante}
                    onAceptar={aceptarEntrante}
                    onRechazar={rechazarEntrante}
                />
            )}

            {activeCall && (
                <Call
                    llamada={activeCall}
                    remotos={Object.values(remotos)}
                    localStream={localStream}
                    mic={mic}
                    cam={cam}
                    onToggleMic={toggleMic}
                    onToggleCam={toggleCam}
                    onHangup={endCall}
                />
            )}
        </CallContext.Provider>
    );
}

export function useCall() {
    const context = useContext(CallContext);
    if (!context) {
        throw new Error('useCall debe usarse dentro de un <CallProvider>');
    }
    return context;
}