import '../style/components/Post.css'

import { useEffect, useState } from 'react';

import DefaultFoto from '../images/Cat.jpg';
import ReportIcon from '../icons/ui/exclamacion-de-diamante (1).png';
import ReactionIcon_Default from '../icons/ui/Post/reaction/corazon (1).png';
import ReactionIcon_Active from '../icons/ui/Post/reaction/corazon (2).png';
import ComentIcon from '../icons/ui/chat/faro (1).png';

import ShowComentarios from '../includes/ShowComentarios';
import ShowMessage from '../includes/ShowMessage';
import ShowGaleria from '../includes/ShowGaleria';

import { useAuth } from '../context/AuthContext';
import { urlMedia, likePost } from '../services/postService';
import { setFollow, unFollow } from '../services/authService';
import { useIrAPerfil } from '../hook/useIrAPerfil';

// El Post recibe el objeto que manda el backend:
// { id, descripcion, fecha, lugar:{id,nombre}, usuario:{id,username,email,foto},
//   totalComentarios, totalLikes, leDiLike, loSigo, media:[{url,tipo}] }
export default function Post({ post }){

    const { user } = useAuth();
    const irAPerfil = useIrAPerfil();

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

    const [like,setLike] = useState(!!post?.leDiLike);
    const [count,setCount] = useState(post?.totalLikes ?? 0);
    const [siguiendo,setSiguiendo] = useState(!!post?.loSigo);

    const [mostrarComentarios, setMostrarComentarios] = useState(false);
    const [mostrarReporte, setMostrarReporte] = useState(false);
    const [comentarios, setComentarios] = useState(totalComentarios);

    // Si el feed se vuelve a cargar (por ejemplo cuando ya hay sesión), se actualizan los valores
    useEffect(() => {
        setLike(!!post?.leDiLike);
        setCount(post?.totalLikes ?? 0);
        setSiguiendo(!!post?.loSigo);
    }, [post?.leDiLike, post?.totalLikes, post?.loSigo]);

    // Mantiene sincronizados los Posts repetidos en pantalla (el del feed y el que se ve
    // dentro de los comentarios), y todos los Posts del mismo autor al seguirlo.
    useEffect(() => {
        const onLike = (e) => {
            if (e.detail.id !== id) return;
            setLike(e.detail.leDiLike);
            setCount(e.detail.total);
        };
        const onFollow = (e) => {
            if (e.detail.userId === usuario?.id) setSiguiendo(e.detail.siguiendo);
        };

        window.addEventListener('post:like', onLike);
        window.addEventListener('follow:cambio', onFollow);
        return () => {
            window.removeEventListener('post:like', onLike);
            window.removeEventListener('follow:cambio', onFollow);
        };
    }, [id, usuario?.id]);

    // Visor de imágenes: solo existe si hay más de 3 (el post solo muestra 3 + el "+N")
    const tieneGaleria = items.length > 3;
    const [galeriaIndex, setGaleriaIndex] = useState(null); // null = cerrado

    const abrirGaleria = (i) => {
        if (tieneGaleria) setGaleriaIndex(i);
    };

    const handleLike = async () => {
        if (!user?.id || !id) return; // sin sesión no se puede dar like

        const nuevo = !like;
        setLike(nuevo); // cambio el corazón de inmediato...
        setCount(c => c + (nuevo ? 1 : -1));

        try {
            const data = await likePost(id, user.id, nuevo);
            if (!data.success) throw new Error(data.error);

            window.dispatchEvent(new CustomEvent('post:like', {
                detail: { id, leDiLike: nuevo, total: data.totalLikes }
            }));
        }
        catch (err) {
            console.error(err);
            setLike(!nuevo); // ...y si el servidor falló, lo regreso
            setCount(c => c + (nuevo ? -1 : 1));
        }
    };

    const handleFollow = async () => {
        if (!user?.id || !usuario?.id) return;

        const yaSigue = siguiendo;
        setSiguiendo(!yaSigue);

        try {
            // mismo orden que en Perfil.jsx: (a quién, quién soy yo)
            const data = yaSigue
                ? await unFollow(usuario.id, user.id)
                : await setFollow(usuario.id, user.id);

            if (!data.success) throw new Error(data.error);

            window.dispatchEvent(new CustomEvent('follow:cambio', {
                detail: { userId: usuario.id, siguiendo: !yaSigue }
            }));
        }
        catch (err) {
            console.error(err);
            setSiguiendo(yaSigue);
        }
    };

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
                className='avatar-img-post'
                onClick={() => irAPerfil(usuario?.id)}/>
                <h2 className='username-post' onClick={() => irAPerfil(usuario?.id)}>
                    {usuario?.username || 'UserName'}
                </h2>
                <p className='user-email-post'>{usuario?.email || ''}</p>
                <p className='date-post'>{fechaTexto}</p>
                {!esMio && (
                    <button className={siguiendo ? 'btn-follow following' : 'btn-follow'} onClick={handleFollow}>
                        {siguiendo ? 'Siguiendo' : 'Seguir'}
                    </button>
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
                <p className='reaction-count'>{count}</p>
                <img src={ComentIcon} alt="comment" className='comment' onClick={() => setMostrarComentarios(true)}/>
                <p className='comment-count'>{comentarios}</p>
            </div>

            {mostrarComentarios && (
                <ShowComentarios
                    post={{ ...post, leDiLike: like, totalLikes: count, loSigo: siguiendo, totalComentarios: comentarios }}
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