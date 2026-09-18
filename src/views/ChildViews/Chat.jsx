import { useState, useRef, useEffect } from 'react';

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

const MENSAJES_DEMO = [
    { id: 1, text: 'Hola',  clock: '10:20 a.m.', own: true,  status: 'pending' },
    { id: 2, text: 'Hola?', clock: '5:20 p.m.',  own: true,  status: 'seen'    },
    { id: 3, text: 'Hola',  clock: '10:20 a.m.', own: false                    },
];

export default function Chat({ contact, onBack }){
    const [mensajes, setMensajes] = useState(MENSAJES_DEMO);
    const [texto, setTexto] = useState('');
    const [mostrarMultimedia, setMostrarMultimedia] = useState(false);
    const [mostrarEmojis, setMostrarEmojis] = useState(false);
    const [mostrarItinerarios, setMostrarItinerarios] = useState(false);

    // La llamada ahora vive en un contexto global (CallProvider),
    // así no se pierde ni se reinicia cuando cambias de página.
    const { startCall } = useCall();

    const finRef = useRef(null);
    const textingWrapperRef = useRef(null);

    // baja el scroll al último mensaje
    useEffect(() => {
        finRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [mensajes]);

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

    const enviar = () => {
        const limpio = texto.trim();
        if (!limpio) return;

        setMensajes(prev => [...prev, {
            id: Date.now(),
            text: limpio,
            clock: horaActual(),
            own: true,
            status: 'pending',
        }]);
        setTexto('');
    };

    // --- Lo que dispara cada opción del DropdownMultimedia ---

    const handleArchivo = (file, tipo) => {
        // TODO: cuando haya backend, aquí se sube "file" de verdad.
        // Por ahora solo lo reflejamos como mensaje para ver el flujo completo.
        setMensajes(prev => [...prev, {
            id: Date.now(),
            type: 'archivo',
            archivoTipo: tipo,
            archivoNombre: file.name,
            clock: horaActual(),
            own: true,
            status: 'pending',
        }]);
    };

    const handleUbicacion = ({ lat, lng }) => {
        setMensajes(prev => [...prev, {
            id: Date.now(),
            type: 'ubicacion',
            lat,
            lng,
            clock: horaActual(),
            own: true,
            status: 'pending',
        }]);
    };

    const handleSeleccionarItinerario = (itinerario) => {
        setMensajes(prev => [...prev, {
            id: Date.now(),
            type: 'itinerario',
            itinerarioNombre: itinerario.nombre,
            clock: horaActual(),
            own: true,
            status: 'pending',
        }]);
        setMostrarItinerarios(false);
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
            <div className='chat-messages'>
                {mensajes.map(m => (
                    <Message key={m.id} {...m} />
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