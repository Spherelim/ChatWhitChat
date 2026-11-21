import '../style/components/ComentarioCard.css';
import { useEffect, useState } from 'react';

import { useAuth } from '../context/AuthContext';
import { likeComentario } from '../services/postService.js';
import { useIrAPerfil } from '../hook/useIrAPerfil';

import DefaultFoto from '../images/Cat.jpg';
import ReportIcon from '../icons/ui/exclamacion-de-diamante (1).png';
import ReactionIcon_Default from '../icons/ui/Post/reaction/corazon (1).png';
import ReactionIcon_Active from '../icons/ui/Post/reaction/corazon (2).png';
import ComentIcon from '../icons/ui/chat/faro (1).png';

import ShowMessage from '../includes/ShowMessage';

export default function ComentarioCard({
    id = null,
    comentario = '', usuario = null, fecha = null,
    leDiLike = false, totalLikes = 0, totalRespuestas = 0,
    esRespuesta = false, esUltimo = false, respondiendoA = null,
    onResponder = () => {}
}){

    const { user } = useAuth();
    const irAPerfil = useIrAPerfil();

    const [like, setLike] = useState(!!leDiLike);
    const [count, setCount] = useState(totalLikes);
    const [mostrarReporte, setMostrarReporte] = useState(false);

    // Cuando se recarga la lista de comentarios llegan los valores del servidor
    useEffect(() => {
        setLike(!!leDiLike);
        setCount(totalLikes);
    }, [leDiLike, totalLikes]);

    const handleLike = async () => {
        if (!user?.id || !id) return; // sin sesión no se puede dar like

        const nuevo = !like;
        setLike(nuevo);
        setCount(c => c + (nuevo ? 1 : -1));

        try {
            const data = await likeComentario(id, user.id, nuevo);
            if (!data.success) throw new Error(data.error);
            setCount(data.totalLikes); // el número real del servidor
        }
        catch (err) {
            console.error(err);
            setLike(!nuevo);
            setCount(c => c + (nuevo ? -1 : 1));
        }
    };

    return(
        <>
            <div className={`Comentario-Container ${esUltimo ? 'ultimo' : ''}`}>
                {/* Esto es la parte de la Linea, si comenta un comentario cambia a la de la flecha */}
                {/* si se puede interpretar o mejorar de otra manera mejor */}
                <div className='comentario-despliegue'>
                    <img src={usuario?.foto || DefaultFoto} alt="User-foto" className='comentario-user-avatar'
                    onClick={() => irAPerfil(usuario?.id)}/>
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
                        <p className='comentario-username' onClick={() => irAPerfil(usuario?.id)}>
                            {usuario?.username}
                        </p>
                        <p className='comentario-email'>{usuario?.email}</p>

                        <p className='comentario-Time'>{fecha ?
                        new Date(fecha).toLocaleDateString('es-MX',
                        {day:'numeric',month:'short'}) : ''}</p>

                    </div>
                    <div className='comentario-texto'>
                        <p className='comentario'>
                            {esRespuesta && respondiendoA && (
                                <span className='comentario-mencion'>@{respondiendoA}</span>
                            )}
                            {' ' +comentario}
                        </p>
                    </div>
                    <div className='coentario-reacciones'>
                        <div className='reaccion-item' onClick={handleLike}>
                            <img
                                src={like ? ReactionIcon_Active : ReactionIcon_Default}
                                alt="Like" className='comentario-like'
                            />
                            <span>{count}</span>
                        </div>
                        <div className='reaccion-item' onClick={onResponder}>
                            <img src={ComentIcon} alt="Comentar" className='comentario-comentar'/>
                            <span>{totalRespuestas}</span>
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