import '../style/components/ComentarioCard.css';
import { useState } from 'react';

import DefaultFoto from '../images/Cat.jpg';
import ReportIcon from '../icons/ui/exclamacion-de-diamante (1).png';
import ReactionIcon_Default from '../icons/ui/Post/reaction/corazon (1).png';
import ReactionIcon_Active from '../icons/ui/Post/reaction/corazon (2).png';
import ComentIcon from '../icons/ui/chat/faro (1).png';

import ShowMessage from '../includes/ShowMessage';

export default function ComentarioCard({
    comentario = 'Esta horrible el lugar.',
    esRespuesta = false,
    esUltimo = false,
    respondiendoA = null,
    onResponder = () => {}
}){

    const [like, setLike] = useState(false);
    const [mostrarReporte, setMostrarReporte] = useState(false);

    const handleLike = () => setLike(prev => !prev);

    return(
        <>
            <div className={`Comentario-Container ${esUltimo ? 'ultimo' : ''}`}>
                {/* Esto es la parte de la Linea, si comenta un comentario cambia a la de la flecha */}
                {/* si se puede interpretar o mejorar de otra manera mejor */}
                <div className='comentario-despliegue'>
                    <img src={DefaultFoto} alt="User-foto" className='comentario-user-avatar'/>
                    <svg className='comentario-linea' viewBox="0 0 40 100" preserveAspectRatio="none">
                        {esRespuesta ? (
                            <>
                                <path d="M 20 0 L 20 45 Q 20 60 34 60 L 40 60"
                                    fill="none" stroke="currentColor" strokeWidth="2.5"/>
                                <polygon points="34,54 44,60 34,66" fill="currentColor"/>
                            </>
                        ) : (
                            <line x1="20" y1="0" x2="20" y2="100" stroke="currentColor" strokeWidth="2.5"/>
                        )}
                    </svg>
                </div>

                <div className='comentario-body'>
                    <div className='comentario-user-info'>
                        <p className='comentario-username'>UserName</p>
                        <p className='comentario-email'>Correo@mail.com</p>
                        <p className='comentario-Time'>2d</p>
                    </div>
                    <div className='comentario-texto'>
                        <p className='comentario'>
                            {esRespuesta && respondiendoA && (
                                <span className='comentario-mencion'>@{respondiendoA} </span>
                            )}
                            {comentario}
                        </p>
                    </div>
                    <div className='coentario-reacciones'>
                        <div className='reaccion-item' onClick={handleLike}>
                            <img
                                src={like ? ReactionIcon_Active : ReactionIcon_Default}
                                alt="Like" className='comentario-like'
                            />
                            <span>{like ? 7 : 6}</span>
                        </div>
                        <div className='reaccion-item' onClick={onResponder}>
                            <img src={ComentIcon} alt="Comentar" className='comentario-comentar'/>
                            <span>3</span>
                        </div>
                        <img
                            src={ReportIcon} alt="reportar" className='comentario-report'
                            onClick={() => setMostrarReporte(true)}
                        />
                    </div>
                </div>
            </div>

            {mostrarReporte && (
                <ShowMessage
                    titulo='¿Desea dejar un comentario a cerca del reporte del comentario?'
                    onClose={() => setMostrarReporte(false)}
                />
            )}
        </>
    );
}