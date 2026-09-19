import '../style/components/Post.css'

import { useState } from 'react';

import DefaultFoto from '../images/Cat.jpg';
import ReportIcon from '../icons/ui/exclamacion-de-diamante (1).png';
import ReactionIcon_Default from '../icons/ui/Post/reaction/corazon (1).png';
import ReactionIcon_Active from '../icons/ui/Post/reaction/corazon (2).png';
import ComentIcon from '../icons/ui/chat/faro (1).png';

import ShowComentarios from '../includes/ShowComentarios';
import ShowMessage from '../includes/ShowMessage';

export default function Post({
    descripcion = 'Hola papus, este es un ejemplo de como se veria un post.\nEsto Tiene que a fuerzas hablar de un Lugar para poder comentar jeje.',
    imagenes = null,
    venue = null
}){

    const imagenesDemo = [
        'https://i.pinimg.com/736x/2b/4a/68/2b4a687a6dc22912342c9e9dae2f1d1c.jpg',
        'https://i.pinimg.com/736x/2b/4a/68/2b4a687a6dc22912342c9e9dae2f1d1c.jpg',
        'https://i.pinimg.com/736x/2b/4a/68/2b4a687a6dc22912342c9e9dae2f1d1c.jpg',
    ];

    const imgs = imagenes && imagenes.length > 0 ? imagenes : imagenesDemo;

    const [like,setlike] = useState(false);
    const [Count,setCount] = useState(0);

    const [Follow,setFollow] = useState(false);

    const [mostrarComentarios, setMostrarComentarios] = useState(false);
    const [mostrarReporte, setMostrarReporte] = useState(false);

    const handleLike = () => {
        setlike(prev => !prev);
        if(like)
            setCount(0);
        else
            setCount(1);
    };
    
    const handleFollow = () => setFollow(prev => !prev);

    return(
        <div className='Post-container'>
            <div className='post-perfil-info'>
                <img src={DefaultFoto} alt="Foto"
                className='avatar-img-post'/>
                <h2 className='username-post'> UserName</h2>
                <p className='user-email-post'>UserName@example.com</p>
                <p className='date-post'>Date (14 Sep 2026)</p>
                <button className={Follow ? 'btn-follow following' : 'btn-follow'} onClick={handleFollow}>{Follow ? 'Siguiendo' : 'Seguir'}</button>
                <img src={ReportIcon} alt="Report" className='report' onClick={() => setMostrarReporte(true)}/>
            </div>
            <div className='post-info'>
                {venue && <p className='post-venue'>📍 {venue}</p>}
                <p className='description-post'>{descripcion}</p>
                {imgs.length > 0 && (
                    <div className='multimedia-post'>
                        {imgs.slice(0, 3).map((src, i) => (
                            i === 2 && imgs.length > 3 ? (
                                <div className='img-wrapper' key={i}>
                                    <img src={src} alt="multimedia" />
                                    <span className='multimedia-more'>+{imgs.length - 3}</span>
                                </div>
                            ) : (
                                <img src={src} alt="multimedia" key={i} />
                            )
                        ))}
                    </div>
                )}
            </div>
            <div className='reaction-post'>
                <img src={like ? ReactionIcon_Active : ReactionIcon_Default} alt="reaction" className='react'
                onClick={handleLike}/>
                <p className='reaction-count'>{Count}</p>
                <img src={ComentIcon} alt="comment" className='comment' onClick={() => setMostrarComentarios(true)}/>
                <p className='comment-count'>0</p>
            </div>

            {mostrarComentarios && (
                <ShowComentarios onClose={() => setMostrarComentarios(false)} />
            )}

            {mostrarReporte && (
                <ShowMessage
                    titulo='¿Desea dejar un comentario a cerca del reporte?'
                    onClose={() => setMostrarReporte(false)}
                />
            )}
        </div>
        // Targeta del Post
    );
}