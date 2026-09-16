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

const MENSAJES_DEMO = [
    { id: 1, text: 'Hola',  clock: '10:20 a.m.', own: true,  status: 'pending' },
    { id: 2, text: 'Hola?', clock: '5:20 p.m.',  own: true,  status: 'seen'    },
    { id: 3, text: 'Hola',  clock: '10:20 a.m.', own: false                    },
];

export default function Chat({ contact, onBack }){
    const [mensajes, setMensajes] = useState(MENSAJES_DEMO);
    const [texto, setTexto] = useState('');
    const finRef = useRef(null);

    // baja el scroll al último mensaje
    useEffect(() => {
        finRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [mensajes]);

    const enviar = () => {
        const limpio = texto.trim();
        if (!limpio) return;

        setMensajes(prev => [...prev, {
            id: Date.now(),
            text: limpio,
            clock: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
            own: true,
            status: 'pending',
        }]);
        setTexto('');
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
                    <img src={CallIcon} alt="llamada" />
                    <img src={VideoCallIcon} alt="Videollamada" />
                </div>
            </div>

            {/* --- Mensajes (scrolleable) --- */}
            <div className='chat-messages'>
                {mensajes.map(m => (
                    <Message
                        key={m.id}
                        text={m.text}
                        clock={m.clock}
                        own={m.own}
                        status={m.status}
                    />
                ))}
                <div ref={finRef} />
            </div>

            {/* --- Barra de escritura --- */}
            <div className='chat-texting'>
                <div className='texting-box'>
                    <img src={EmojiIcon} alt="emojis" className='texting-emojis'/>
                    <input
                        type="text"
                        className='texting'
                        placeholder='Escribe un Mensaje...'
                        value={texto}
                        onChange={(e) => setTexto(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && enviar()}
                    />
                    <img src={ClipIcon} alt="Multimedias" className='texting-Multimedia'/>
                </div>

                <button type="button" className='texting-send' onClick={enviar} title='Enviar'>
                    <img src={SendIcon} alt="Enviar" />
                </button>
            </div>

        </div>
    );
}