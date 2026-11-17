import '../style/components/Post.css'

import { useState } from 'react';

import DefaultFoto from '../images/Cat.jpg';
import ReportIcon from '../icons/ui/exclamacion-de-diamante (1).png';
import ReactionIcon_Default from '../icons/ui/Post/reaction/corazon (1).png';
import ReactionIcon_Active from '../icons/ui/Post/reaction/corazon (2).png';
import ComentIcon from '../icons/ui/chat/faro (1).png';

import ShowComentarios from '../includes/ShowComentarios';
import ShowMessage from '../includes/ShowMessage';
import ShowGaleria from '../includes/ShowGaleria';

import { useAuth } from '../context/AuthContext';
import { urlMedia } from '../services/postService';

// Ahora el Post recibe el objeto que manda el backend:
// { id, descripcion, fecha, lugar:{id,nombre}, usuario:{id,username,email,foto}, totalComentarios, media:[{url,tipo}] }
export default function Post({ post }){

    const { user } = useAuth();

    const {
        id,
        descripcion = '',
        fecha,
        lugar,
        usuario,
        media = [],
        totalComentarios = 0
    } = post || {};

    // [{ url, tipo }] con la URL ya completa
    const items = media.map(m => ({ url: urlMedia(m.url), tipo: m.tipo }));

    const [like,setlike] = useState(false);
    const [Count,setCount] = useState(0);
    const [Follow,setFollow] = useState(false);

    const [mostrarComentarios, setMostrarComentarios] = useState(false);
    const [mostrarReporte, setMostrarReporte] = useState(false);
    const [comentarios, setComentarios] = useState(totalComentarios);

    // Visor de imágenes: solo existe si hay más de 3 (el post solo muestra 3 + el "+N")
    const tieneGaleria = items.length > 3;
    const [galeriaIndex, setGaleriaIndex] = useState(null); // null = cerrado

    const abrirGaleria = (i) => {
        if (tieneGaleria) setGaleriaIndex(i);
    };

    const handleLike = () => {
        setlike(prev => !prev);
        setCount(like ? 0 : 1);
    };

    const handleFollow = () => setFollow(prev => !prev);

    const esMio = user && usuario && user.id === usuario.id;

    const fechaTexto = fecha
        ? new Date(fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';

    const renderItem = (item, i) => item.tipo === 'video'
        ? <video src={item.url} key={i} muted controls={!tieneGaleria} onClick={() => abrirGaleria(i)} />
        : <img src={item.url} alt="multimedia" key={i} onClick={() => abrirGaleria(i)} />;

    return(
        <div className='Post-container'>
            <div className='post-perfil-info'>
                <img src={usuario?.foto || DefaultFoto} alt="Foto"
                className='avatar-img-post'/>
                <h2 className='username-post'>{usuario?.username || 'UserName'}</h2>
                <p className='user-email-post'>{usuario?.email || ''}</p>
                <p className='date-post'>{fechaTexto}</p>
                {!esMio && (
                    <button className={Follow ? 'btn-follow following' : 'btn-follow'} onClick={handleFollow}>{Follow ? 'Siguiendo' : 'Seguir'}</button>
                )}
                <img src={ReportIcon} alt="Report" className='report' onClick={() => setMostrarReporte(true)}/>
            </div>
            <div className='post-info'>
                {lugar && <p className='post-venue'>{lugar.nombre}</p>}
                <p className='description-post'>{descripcion}</p>
                {items.length > 0 && (
                    <div className={`multimedia-post ${tieneGaleria ? '' : 'sin-galeria'}`}>
                        {items.slice(0, 3).map((item, i) => (
                            i === 2 && items.length > 3 ? (
                                <div className='img-wrapper' key={i}>
                                    {renderItem(item, i)}
                                    <span className='multimedia-more'>+{items.length - 3}</span>
                                </div>
                            ) : (
                                renderItem(item, i)
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
                <p className='comment-count'>{comentarios}</p>
            </div>

            {mostrarComentarios && (
                <ShowComentarios
                    post={post}
                    onClose={() => setMostrarComentarios(false)}
                    onTotal={setComentarios}
                />
            )}

            {galeriaIndex !== null && (
                <ShowGaleria
                    imagenes={items}
                    indiceInicial={galeriaIndex}
                    onClose={() => setGaleriaIndex(null)}
                />
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