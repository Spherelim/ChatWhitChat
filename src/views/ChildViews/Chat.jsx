import { useState, useRef, useEffect, useCallback } from 'react';

import '../../style/ChildViews/Chat.css'

import DefaultFoto from '../../images/Cat.jpg';
import BackIcon from '../../icons/ui/flechas/izquierda (1)-w.png';
import CallIcon from '../../icons/ui/chat/calling/llamada-telefonica (1).png';
import VideoCallIcon from '../../icons/ui/chat/calling/video-camara-alt (1).png';
import EmojiIcon from '../../icons/ui/chat/haz-de-sonrisa.png';
import ClipIcon from '../../icons/ui/chat/clip-vertical.png';
import SendIcon from '../../icons/ui/chat/parte-superior-del-avion-de-papel.png';

import Message from '../../components/Message';
import DropdownMultimedia from '../../components/DropdownMultimedia';
import EmojiPicker from '../../components/EmojiPiker';
import ShowItinerarios from '../../includes/ShowItinerarios';

import { useCall } from '../../context/CallContext';
import { useAuth } from '../../context/AuthContext.jsx';

import { conectarSocket, getSocket } from '../../services/Socket.js';
import {
    abrirConversacionPrivada,
    getMensajes,
    subirArchivo,
    mensajeAUI,
    formatearHora,
} from '../../services/Chatservice.js';

const nuevaClave = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function Chat({ contact, onBack }){
    const { user } = useAuth();
    const miId = user?.id;

    const [mensajes, setMensajes] = useState([]);
    const [estado, setEstado] = useState('cargando');   // 'cargando' | 'listo' | 'error'
    const [texto, setTexto] = useState('');
    const [mostrarMultimedia, setMostrarMultimedia] = useState(false);
    const [mostrarEmojis, setMostrarEmojis] = useState(false);
    const [mostrarItinerarios, setMostrarItinerarios] = useState(false);

    // La llamada ahora vive en un contexto global (CallProvider),
    // así no se pierde ni se reinicia cuando cambias de página.
    const { startCall } = useCall();

    const finRef = useRef(null);
    const textingWrapperRef = useRef(null);

    const conversacionRef = useRef(null);       // id de la conversación abierta
    const ultimoRecibidoRef = useRef(null);     // id del último mensaje que me mandó el otro
    const pegadoAbajoRef = useRef(true);        // ¿estoy viendo lo más reciente?
    const previewsRef = useRef([]);             // blob: de previews, para liberarlos al salir

    // ---------- Scroll ----------
    const bajar = useCallback((suave = true) => {
        finRef.current?.scrollIntoView({ behavior: suave ? 'smooth' : 'auto' });
    }, []);

    const alHacerScroll = (e) => {
        const el = e.currentTarget;
        pegadoAbajoRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    };

    // Baja al último mensaje: siempre si lo mandé yo; si lo recibí, solo si ya estaba abajo
    // (así no te "jalonea" si estás leyendo mensajes viejos)
    useEffect(() => {
        const ultimo = mensajes[mensajes.length - 1];
        if (ultimo?.own || pegadoAbajoRef.current) bajar();
    }, [mensajes, bajar]);

    // ---------- Abrir la conversación + historial + tiempo real ----------
    useEffect(() => {
        if (!miId || !contact?.id) return;

        let cancelado = false;
        const socket = conectarSocket(miId);

        pegadoAbajoRef.current = true;
        ultimoRecibidoRef.current = null;
        conversacionRef.current = null;
        setMensajes([]);
        setEstado('cargando');

        // Le avisa al otro que ya leí hasta su último mensaje (solo si estoy viendo la pestaña)
        const avisarLeido = () => {
            if (document.visibilityState !== 'visible') return;
            if (!conversacionRef.current || !ultimoRecibidoRef.current) return;

            socket.emit('conversacion:leida', {
                conversacionId: conversacionRef.current,
                hastaId: ultimoRecibidoRef.current,
            });
        };

        const cargarHistorial = async () => {
            const data = await getMensajes(conversacionRef.current, miId);
            if (!data.success) throw new Error(data.error);
            if (cancelado) return;

            const otros = data.participantes.filter(p => p.usuarioId !== miId);
            const historial = data.mensajes.map(m =>
                mensajeAUI(m, miId, otros.length > 0 && otros.every(p => (p.ultimoLeido ?? 0) >= m.id))
            );

            // Conservo lo que aún está "subiendo/enviando" (ids temporales) por si se reconectó a medias
            setMensajes(prev => [...historial, ...prev.filter(m => typeof m.id === 'string')]);

            const ultimoAjeno = [...data.mensajes].reverse().find(m => m.remitenteId !== miId);
            ultimoRecibidoRef.current = ultimoAjeno?.id ?? null;
            avisarLeido();
        };

        const iniciar = async () => {
            try {
                const abierta = await abrirConversacionPrivada(miId, contact.id);
                if (!abierta.success) throw new Error(abierta.error);
                if (cancelado) return;

                conversacionRef.current = abierta.conversacionId;
                await cargarHistorial();
                if (!cancelado) setEstado('listo');
            } catch (err) {
                if (!cancelado) {
                    console.error('Error al abrir el chat:', err);
                    setEstado('error');
                }
            }
        };

        // Llegó un mensaje (del otro, o mío desde otra pestaña/dispositivo)
        const alRecibir = (m) => {
            if (m.conversacionId !== conversacionRef.current) return;

            setMensajes(prev => prev.some(x => x.id === m.id) ? prev : [...prev, mensajeAUI(m, miId)]);

            if (m.remitenteId !== miId) {
                ultimoRecibidoRef.current = m.id;
                avisarLeido();
            }
        };

        // El otro leyó mis mensajes -> pasan a "visto"
        const alLeer = (d) => {
            if (d.conversacionId !== conversacionRef.current || d.lectorId === miId) return;

            setMensajes(prev => prev.map(m =>
                m.own && typeof m.id === 'number' && m.id <= d.hastaId && m.status !== 'seen'
                    ? { ...m, status: 'seen' }
                    : m
            ));
        };

        // Si se cayó el internet y volvió, recupero lo que me perdí mientras tanto
        const alReconectar = () => {
            if (conversacionRef.current) cargarHistorial().catch(err => console.error(err));
        };

        iniciar();

        socket.on('mensaje:nuevo', alRecibir);
        socket.on('conversacion:leida', alLeer);
        socket.io.on('reconnect', alReconectar);
        document.addEventListener('visibilitychange', avisarLeido);

        return () => {
            cancelado = true;
            socket.off('mensaje:nuevo', alRecibir);
            socket.off('conversacion:leida', alLeer);
            socket.io.off('reconnect', alReconectar);
            document.removeEventListener('visibilitychange', avisarLeido);
            conversacionRef.current = null;
        };
    }, [miId, contact?.id]);

    // Libera los blob: de las previews al cerrar el chat
    useEffect(() => () => {
        previewsRef.current.forEach(url => URL.revokeObjectURL(url));
    }, []);

    // cierra el dropdown de multimedia o el de emojis si se hace click afuera
    useEffect(() => {
        const cerrarSiEsAfuera = (evento) => {
            if (textingWrapperRef.current && !textingWrapperRef.current.contains(evento.target)) {
                setMostrarMultimedia(false);
                setMostrarEmojis(false);
            }
        };
        document.addEventListener('mousedown', cerrarSiEsAfuera);
        return () => document.removeEventListener('mousedown', cerrarSiEsAfuera);
    }, []);

    const horaActual = () =>
        new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

    // ---------- Enviar ----------

    // Pone el mensaje en pantalla de inmediato (amarillo = pendiente) y devuelve su clave temporal
    const agregarPendiente = (datos) => {
        const key = nuevaClave();
        setMensajes(prev => [...prev, {
            key,
            id: key,
            clock: horaActual(),
            own: true,
            status: 'pending',
            ...datos,
        }]);
        return key;
    };

    const marcarError = (key) => {
        setMensajes(prev => prev.map(m => m.key === key ? { ...m, status: 'error' } : m));
    };

    // El servidor confirmó: el mensaje toma su id real y pasa a "enviado"
    const confirmar = (key, enviado) => {
        setMensajes(prev => {
            // Si por otro camino ya había llegado con su id real, quito el duplicado temporal
            if (prev.some(m => m.id === enviado.id)) return prev.filter(m => m.key !== key);

            return prev.map(m => m.key === key
                ? { ...m, id: enviado.id, clock: formatearHora(enviado.fecha), status: 'sent', url: enviado.contenido?.url ?? m.url }
                : m
            );
        });
    };

    // "conversacionId" se pasa explícito: si cambias de chat mientras se sube un archivo,
    // el mensaje igual se va a la conversación donde lo empezaste.
    const emitirMensaje = (conversacionId, key, tipo, contenido) => {
        const socket = getSocket();

        if (!socket || !conversacionId) {
            marcarError(key);
            return;
        }

        socket.timeout(15000).emit('mensaje:enviar', { conversacionId, tipo, contenido }, (err, res) => {
            if (err || !res?.ok) {
                if (res?.error) console.error('No se pudo enviar:', res.error);
                marcarError(key);
                return;
            }
            confirmar(key, res.mensaje);
        });
    };

    const enviar = () => {
        const limpio = texto.trim();
        if (!limpio || !conversacionRef.current) return;

        const key = agregarPendiente({ type: 'texto', text: limpio });
        emitirMensaje(conversacionRef.current, key, 'texto', { texto: limpio });
        setTexto('');
    };

    // --- Lo que dispara cada opción del DropdownMultimedia ---

    // tipo: 'documento' | 'media' (foto/video) | 'audio'
    const handleArchivo = async (file, tipo) => {
        const conversacionId = conversacionRef.current;
        if (!conversacionId) return;

        // Preview inmediata con el archivo local, mientras se sube al servidor
        const previewLocal = URL.createObjectURL(file);
        previewsRef.current.push(previewLocal);

        const key = agregarPendiente({
            type: tipo,
            nombre: file.name,
            mime: file.type,
            size: file.size,
            previewLocal,
        });

        try {
            const subido = await subirArchivo(file);
            emitirMensaje(conversacionId, key, tipo, {
                url: subido.url,
                nombre: subido.nombre,
                mime: subido.mime,
                size: subido.size,
            });
        } catch (err) {
            console.error('Error al subir el archivo:', err);
            marcarError(key);
        }
    };

    const handleUbicacion = ({ lat, lng }) => {
        if (!conversacionRef.current) return;

        const key = agregarPendiente({ type: 'ubicacion', lat, lng });
        emitirMensaje(conversacionRef.current, key, 'ubicacion', { lat, lng });
    };

    const handleSeleccionarItinerario = (itinerario) => {
        setMostrarItinerarios(false);
        if (!conversacionRef.current) return;

        const key = agregarPendiente({ type: 'itinerario', nombre: itinerario.nombre, foto: itinerario.foto });
        emitirMensaje(conversacionRef.current, key, 'itinerario', {
            itinerarioId: itinerario.id,
            nombre: itinerario.nombre,
            foto: itinerario.foto,
        });
    };

    const handleSeleccionarEmoji = (emoji) => {
        setTexto(prev => prev + emoji);
    };

    return(
        <div className='Chat-container'>

            {/* --- Cabecera --- */}
            <div className='chat-header'>
                <div className='chat-user'>
                    <button type="button" className='chat-back' onClick={onBack} title='Volver'>
                        <img src={BackIcon} alt="volver" />
                    </button>
                    <img src={contact?.avatar || DefaultFoto} alt="avatar" className='chat-user-img'/>
                    <div className='chat-user-info'>
                        <p className='chat-user-name'>{contact?.username || 'UserName'}</p>
                        <p className='chat-user-status'>{contact?.lastMessage || 'últ. vez hoy a las 4:32 p.m.'}</p>
                    </div>
                </div>

                <div className='calling-icons'>
                    <img src={CallIcon} alt="llamada" onClick={() => startCall(contact, 'audio')} />
                    <img src={VideoCallIcon} alt="Videollamada" onClick={() => startCall(contact, 'video')} />
                </div>
            </div>

            {/* --- Mensajes (scrolleable) --- */}
            <div className='chat-messages' onScroll={alHacerScroll}>
                {estado === 'cargando' && <p className='chat-estado'>Cargando mensajes...</p>}
                {estado === 'error' && <p className='chat-estado chat-estado-error'>No se pudo abrir el chat. Intenta de nuevo.</p>}

                {mensajes.map(({ key, ...m }) => (
                    <Message
                        key={key ?? m.id}
                        {...m}
                        onMediaLoad={() => pegadoAbajoRef.current && bajar(false)}
                    />
                ))}
                <div ref={finRef} />
            </div>

            {/* --- Barra de escritura + dropdowns de multimedia/emojis --- */}
            <div className='chat-texting-wrapper' ref={textingWrapperRef}>

                {mostrarEmojis && (
                    <div className='emoji-anchor'>
                        <EmojiPicker onSelect={handleSeleccionarEmoji} />
                    </div>
                )}

                {mostrarMultimedia && (
                    <div className='multimedia-anchor'>
                        <DropdownMultimedia
                            onClose={() => setMostrarMultimedia(false)}
                            onArchivo={handleArchivo}
                            onUbicacion={handleUbicacion}
                            onAbrirItinerarios={() => setMostrarItinerarios(true)}
                        />
                    </div>
                )}

                <div className='chat-texting'>
                    <div className='texting-box'>
                        <img
                            src={EmojiIcon}
                            alt="emojis"
                            className='texting-emojis'
                            onClick={() => {
                                setMostrarEmojis(prev => !prev);
                                setMostrarMultimedia(false);
                            }}
                        />
                        <input
                            type="text"
                            className='texting'
                            placeholder='Escribe un Mensaje...'
                            value={texto}
                            disabled={estado !== 'listo'}
                            onChange={(e) => setTexto(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && enviar()}
                        />
                        <img
                            src={ClipIcon}
                            alt="Multimedias"
                            className='texting-Multimedia'
                            onClick={() => {
                                setMostrarMultimedia(prev => !prev);
                                setMostrarEmojis(false);
                            }}
                        />
                    </div>

                    <button type="button" className='texting-send' onClick={enviar} title='Enviar'>
                        <img src={SendIcon} alt="Enviar" />
                    </button>
                </div>

            </div>

            {mostrarItinerarios && (
                <ShowItinerarios
                    onClose={() => setMostrarItinerarios(false)}
                    onSelect={handleSeleccionarItinerario}
                />
            )}

        </div>
    );
}