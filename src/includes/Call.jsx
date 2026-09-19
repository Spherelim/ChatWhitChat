import { useState, useRef, useEffect } from 'react';

import '../style/includes/Call.css';

import DefaultFoto from '../images/Cat.jpg';

// indica cuando el que llamaste está muteado
import Audio_Muted from '../icons/ui/chat/calling/volumen-silenciado (1).png';

// para activar o desactivar el microfono
import Mic_Active from '../icons/ui/chat/calling/forma-de-microfono-negro (2).png';
import Mic_Muted from '../icons/ui/chat/calling/forma-de-microfono-negro.png';

// para activar y desactivar al camara (si es videollamada)
import Cam_Active from '../icons/ui/chat/calling/camara-de-video (1).png';
import Cam_Desactive from '../icons/ui/chat/calling/camara-de-video.png';

// este icono para el botón de en medio de contestar o colgar
import PfhoneIcon from '../icons/ui/chat/calling/voltear-el-telefono (1).png';

// Estos iconos son para saber que tipo de llamada es
import PfhoneCall_Icon from '../icons/ui/chat/calling/llamada-telefonica (1).png';
import CamCall_Icon from '../icons/ui/chat/calling/video-camara-alt (1).png';

export default function Call({ contact, callType = 'audio', onHangup }){
    // 'sonando' -> todavía no contestan | 'en-llamada' -> ya se contestó
    const [estado, setEstado] = useState('sonando');
    const [micActivo, setMicActivo] = useState(true);
    const [camActiva, setCamActiva] = useState(callType === 'video');
    const [otroMuteado] = useState(false); // TODO: esto vendrá del backend / websocket

    // --- Arrastrar el modal por toda la pantalla ---
    const [pos, setPos] = useState({ x: 24, y: 24 });
    const arrastrando = useRef(false);
    const offset = useRef({ x: 0, y: 0 });

    const iniciarArrastre = (evento) => {
        arrastrando.current = true;
        offset.current = {
            x: evento.clientX - pos.x,
            y: evento.clientY - pos.y,
        };
    };

    useEffect(() => {
        const moviendo = (evento) => {
            if (!arrastrando.current) return;

            const maxX = window.innerWidth - 200;   // 200 ~ ancho del modal
            const maxY = window.innerHeight - 240;  // 240 ~ alto del modal

            setPos({
                x: Math.min(Math.max(0, evento.clientX - offset.current.x), maxX),
                y: Math.min(Math.max(0, evento.clientY - offset.current.y), maxY),
            });
        };
        const soltando = () => { arrastrando.current = false; };

        window.addEventListener('mousemove', moviendo);
        window.addEventListener('mouseup', soltando);
        return () => {
            window.removeEventListener('mousemove', moviendo);
            window.removeEventListener('mouseup', soltando);
        };
    }, []);

    const contestar = () => setEstado('en-llamada');
    const colgar = () => onHangup?.();

    return (
        <div
            className={`Call-container ${estado === 'en-llamada' ? 'is-activa' : 'is-sonando'}`}
            style={{ left: pos.x, top: pos.y }}
        >
            <div className='call-drag-handle' onMouseDown={iniciarArrastre}>
                <div className='call-mini-icons'>
                    {otroMuteado && <img src={Audio_Muted} alt='muteado' className='call-mini-icon' />}
                    <img src={PfhoneCall_Icon} alt='llamada' className='call-mini-icon' />
                    {callType === 'video' && <img src={CamCall_Icon} alt='video' className='call-mini-icon' />}
                </div>
            </div>

            <div className='in-Call'>
                <img src={contact?.avatar || DefaultFoto} alt='avatar' className='call-avatar' />
                <p className='call-username'>{contact?.username || 'UserName'}</p>
                <p className='call-status-text'>
                    {estado === 'sonando' ? 'Llamando...' : 'En llamada'}
                </p>

                <div className='call-controls'>
                    <button
                        type='button'
                        className={`call-btn call-btn-mic ${!micActivo ? 'is-off' : ''}`}
                        onClick={() => setMicActivo(m => !m)}
                        title={micActivo ? 'Silenciar' : 'Activar micrófono'}
                    >
                        <img src={micActivo ? Mic_Active : Mic_Muted} alt='microfono' />
                    </button>

                    {estado === 'sonando' ? (
                        <>
                            <button
                                type='button'
                                className='call-btn call-btn-accept'
                                onClick={contestar}
                                title='Contestar'
                            >
                                <img src={PfhoneIcon} alt='contestar' />
                            </button>
                            <button
                                type='button'
                                className='call-btn call-btn-decline'
                                onClick={colgar}
                                title='Rechazar'
                            >
                                <img src={PfhoneIcon} alt='rechazar' />
                            </button>
                        </>
                    ) : (
                        <button
                            type='button'
                            className='call-btn call-btn-hangup'
                            onClick={colgar}
                            title='Colgar'
                        >
                            <img src={PfhoneIcon} alt='colgar' />
                        </button>
                    )}

                    <button
                        type='button'
                        className={`call-btn call-btn-cam ${!camActiva ? 'is-off' : ''}`}
                        onClick={() => setCamActiva(c => !c)}
                        title={camActiva ? 'Apagar cámara' : 'Encender cámara'}
                    >
                        <img src={camActiva ? Cam_Active : Cam_Desactive} alt='camara' />
                    </button>
                </div>
            </div>
        </div>
    );
}