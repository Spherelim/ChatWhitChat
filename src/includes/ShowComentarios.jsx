import '../style/includes/ShowComentarios.css';
import { useEffect, useMemo, useState } from 'react';

import ComentarioCard from '../components/ComentarioCard';
import Post from '../components/Post';

import { useAuth } from '../context/AuthContext';
import { getComentarios, crearComentario } from '../services/postService';

import SendIcon from '../icons/ui/chat/parte-superior-del-avion-de-papel (1).png';

// Convierte la lista plana (con idPadre) en un orden de hilo:
// cada comentario seguido de sus respuestas (y las respuestas de las respuestas)
function ordenarHilo(planos) {
    const porPadre = new Map();
    planos.forEach(c => {
        const k = c.idPadre ?? 0;
        if (!porPadre.has(k)) porPadre.set(k, []);
        porPadre.get(k).push(c);
    });

    const porId = new Map(planos.map(c => [c.id, c]));
    const salida = [];

    const visitar = (c) => {
        salida.push({
            ...c,
            esRespuesta: c.idPadre != null,
            respondiendoA: c.idPadre != null ? porId.get(c.idPadre)?.usuario.username : null,
        });
        (porPadre.get(c.id) || []).forEach(visitar);
    };

    (porPadre.get(0) || []).forEach(visitar);
    return salida;
}

export default function ShowComentarios({ post, onClose = () => {}, onTotal = () => {} }){

    const { user } = useAuth();

    const [planos, setPlanos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [texto, setTexto] = useState('');
    const [respondiendo, setRespondiendo] = useState(null); // { id, username }
    const [enviando, setEnviando] = useState(false);

    const comentarios = useMemo(() => ordenarHilo(planos), [planos]);

    const cargar = async () => {
        try {
            const data = await getComentarios(post.id);
            if (data.success) {
                setPlanos(data.comentarios);
                onTotal(data.comentarios.length); // actualiza el contador del Post
            }
        } catch (err) {
            console.error(err);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => { cargar(); }, [post.id]);

    const handleResponder = (c) => {
        setRespondiendo({ id: c.id, username: c.usuario.username });
        setTexto(`@${c.usuario.username} `);
    };

    const handleEnviar = async () => {
        const limpio = respondiendo ? texto.replace(`@${respondiendo.username} `, '') : texto;
        if (!limpio.trim() || !user?.id || enviando) return;

        setEnviando(true);
        try {
            const data = await crearComentario(post.id, {
                idUsuario: user.id,
                texto: limpio,
                idPadre: respondiendo?.id ?? null
            });

            if (!data.success) throw new Error(data.error);

            setTexto('');
            setRespondiendo(null);
            await cargar();
        } catch (err) {
            console.error(err);
        } finally {
            setEnviando(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleEnviar();
    };

    return(
        <>
        <div className='MostrarComentario-container'>

            <button className='MostrarComentario-close' onClick={onClose}>×</button>

            {/* Todo esto es scrolleable */}
            <div className='MostrarComentario-Post'>
                <Post post={post}/>
            </div>

            <div className='Comentarios-List'>
                {!cargando && comentarios.length === 0 && (
                    <p style={{ color: '#9a9a9a', textAlign: 'center' }}>Aún no hay comentarios. ¡Sé el primero!</p>
                )}

                {comentarios.map((c, i) => (
                    <ComentarioCard
                        key={c.id}
                        comentario={c.texto}
                        usuario={c.usuario}
                        fecha={c.fecha}
                        esRespuesta={c.esRespuesta}
                        respondiendoA={c.respondiendoA}
                        esUltimo={i === comentarios.length - 1}
                        onResponder={() => handleResponder(c)}
                    />
                ))}
            </div>

            <div className='Comentarios-comentar'>
                {respondiendo && (
                    <span className='Comentarios-respondiendo'>
                        Respondiendo a @{respondiendo.username}
                        <button onClick={() => { setRespondiendo(null); setTexto(''); }}>×</button>
                    </span>
                )}
                <div className='Comentarios-comentar-row'>
                    <input
                        type="text"
                        className='Comentarios-comentar-texto'
                        placeholder={user ? 'Escribe un comentario...' : 'Inicia sesión para comentar'}
                        value={texto}
                        maxLength={1000}
                        disabled={!user}
                        onChange={(e) => setTexto(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <img src={SendIcon} alt="enviar" onClick={handleEnviar}/>
                </div>
            </div>

        </div>
        </>
    )
}