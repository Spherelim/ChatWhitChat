import { useEffect, useRef, useState } from 'react';

import '../style/includes/Call.css';

import DefaultFoto from '../images/Cat.jpg';
import GrupoAvatar from '../components/GrupoAvatar';
import { IconoTelefono, IconoMicrofono, IconoCamara } from './Iconos';

/*
  Ventana de llamada (se puede arrastrar desde la barra de arriba).
    llamada  -> { tipo: 'audio'|'video', nombre, avatar, avatars, estado: 'llamando'|'conectando'|'en-curso'|'terminada', texto, inicio }
    remotos  -> [{ id, username, foto, stream, mic, cam }]   (los demás en la llamada)
*/

// <video> cuyo srcObject se asigna por código (React no lo hace por props)
function Pantalla({ stream, silenciado = false, className = '' }){
    const ref = useRef(null);

    useEffect(() => {
        if(ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream ?? null;
    }, [stream]);

    return <video ref={ref} className={className} autoPlay playsInline muted={silenciado} />;
}

function Recuadro({ persona }){
    // Con la cámara apagada (o en una llamada de solo audio) se ve su foto; el <video> sigue montado para que se oiga
    const hayVideo = !!persona.stream && persona.stream.getVideoTracks().length > 0 && persona.cam !== false;

    return(
        <div className='call-tile'>
            <Pantalla stream={persona.stream} className={`call-tile-video ${hayVideo ? '' : 'is-hidden'}`} />
            {!hayVideo && <img className='call-tile-avatar' src={persona.foto || DefaultFoto} alt={persona.username} />}

            <span className='call-tile-name'>
                {persona.mic === false && <IconoMicrofono apagado className='call-tile-mute' />}
                {persona.username || 'Usuario'}
            </span>

            {persona.fallo && <span className='call-tile-fallo'>Sin conexión</span>}
        </div>
    );
}

function Cronometro({ inicio }){
    const [ahora, setAhora] = useState(Date.now());

    useEffect(() => {
        const id = setInterval(() => setAhora(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const seg = Math.max(0, Math.floor((ahora - inicio) / 1000));
    const mm = String(Math.floor(seg / 60)).padStart(2, '0');
    const ss = String(seg % 60).padStart(2, '0');
    return <>{mm}:{ss}</>;
}

export default function Call({ llamada, remotos = [], localStream, mic, cam, onToggleMic, onToggleCam, onHangup }){
    const esVideo = llamada.tipo === 'video';
    const enCurso = llamada.estado === 'en-curso';
    const terminada = llamada.estado === 'terminada';
    const grupal = remotos.length > 1;

    // ---------- Arrastrar ----------
    const contenedorRef = useRef(null);
    const [pos, setPos] = useState(null);     // null = esquina inferior derecha

    const empezarArrastre = (e) => {
        const caja = contenedorRef.current.getBoundingClientRect();
        const dx = e.clientX - caja.left;
        const dy = e.clientY - caja.top;

        const mover = (ev) => {
            setPos({
                x: Math.min(Math.max(0, ev.clientX - dx), window.innerWidth - caja.width),
                y: Math.min(Math.max(0, ev.clientY - dy), window.innerHeight - caja.height),
            });
        };
        const soltar = () => {
            window.removeEventListener('pointermove', mover);
            window.removeEventListener('pointerup', soltar);
        };

        window.addEventListener('pointermove', mover);
        window.addEventListener('pointerup', soltar);
    };

    const textoEstado = terminada
        ? llamada.texto
        : enCurso
            ? <Cronometro inicio={llamada.inicio} />
            : llamada.estado === 'conectando'
                ? 'Conectando...'
                : (llamada.grupo ? 'Llamando al grupo...' : 'Llamando...');

    const hayCamaraLocal = !!localStream && localStream.getVideoTracks().length > 0;

    return(
        <div
            ref={contenedorRef}
            className={`Call-container ${esVideo ? 'is-video' : ''} ${grupal ? 'is-grupo' : ''}`}
            style={pos ? { left: pos.x, top: pos.y } : { right: 24, bottom: 24 }}
        >
            <div className='call-drag-handle' onPointerDown={empezarArrastre}>
                <div className='call-mini-icons'>
                    <span className='call-mini-icon'>{esVideo ? <IconoCamara /> : <IconoTelefono />}</span>
                </div>
            </div>

            <div className='in-Call'>
                {remotos.length === 0 ? (
                    // Todavía no contesta nadie
                    <>
                        <div className='call-avatar'>
                            {llamada.avatars
                                ? <GrupoAvatar avatars={llamada.avatars} />
                                : <img src={llamada.avatar || DefaultFoto} alt={llamada.nombre} />}
                        </div>
                    </>
                ) : (
                    <div className={`call-tiles tiles-${Math.min(remotos.length, 4)}`}>
                        {remotos.map(p => <Recuadro key={p.id} persona={p} />)}
                    </div>
                )}

                {/* Mi cámara (pequeña) */}
                {esVideo && hayCamaraLocal && cam && (
                    <Pantalla stream={localStream} silenciado className='call-local' />
                )}

                <p className='call-username'>{llamada.nombre}</p>
                <p className='call-status-text'>{textoEstado}</p>

                {!terminada && (
                    <div className='call-controls'>
                        <button type='button' className={`call-btn call-btn-mic ${mic ? '' : 'is-off'}`} onClick={onToggleMic} title={mic ? 'Silenciar' : 'Activar micrófono'}>
                            <IconoMicrofono apagado={!mic} />
                        </button>

                        {esVideo && hayCamaraLocal && (
                            <button type='button' className={`call-btn call-btn-cam ${cam ? '' : 'is-off'}`} onClick={onToggleCam} title={cam ? 'Apagar cámara' : 'Encender cámara'}>
                                <IconoCamara apagado={!cam} />
                            </button>
                        )}

                        <button type='button' className='call-btn call-btn-hangup' onClick={onHangup} title='Colgar'>
                            <IconoTelefono />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}