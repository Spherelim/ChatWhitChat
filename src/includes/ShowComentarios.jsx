import '../style/includes/ShowComentarios.css';
import { useState } from 'react';

import ComentarioCard from '../components/ComentarioCard';
import Post from '../components/Post';

import SendIcon from '../icons/ui/chat/parte-superior-del-avion-de-papel (1).png';

export default function ShowComentarios({ onClose = () => {} }){

    const [comentarios, setComentarios] = useState([
        { id: 1, texto: 'Esta horrible el lugar.', esRespuesta: false, respondiendoA: null },
        { id: 2, texto: 'Quiero despertar y decirme que me alegra estarlo, soñar por las noches, pero no pesadillas.', esRespuesta: true, respondiendoA: 'UserName' },
        { id: 3, texto: 'Esta horrible el lugar.', esRespuesta: false, respondiendoA: null },
    ]);

    const [texto, setTexto] = useState('');
    const [respondiendo, setRespondiendo] = useState(null); // username al que se está respondiendo

    const handleResponder = (username) => {
        setRespondiendo(username);
        setTexto(`@${username} `);
    };

    const handleEnviar = () => {
        if (!texto.trim()) return;

        setComentarios(prev => [
            ...prev,
            {
                id: Date.now(),
                texto: respondiendo ? texto.replace(`@${respondiendo} `, '') : texto,
                esRespuesta: !!respondiendo,
                respondiendoA: respondiendo
            }
        ]);

        setTexto('');
        setRespondiendo(null);
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
                <Post/>
            </div>

            <div className='Comentarios-List'>
                {comentarios.map((c, i) => (
                    <ComentarioCard
                        key={c.id}
                        comentario={c.texto}
                        esRespuesta={c.esRespuesta}
                        respondiendoA={c.respondiendoA}
                        esUltimo={i === comentarios.length - 1}
                        onResponder={() => handleResponder('UserName')}
                    />
                ))}
            </div>

            <div className='Comentarios-comentar'>
                {respondiendo && (
                    <span className='Comentarios-respondiendo'>
                        Respondiendo a @{respondiendo}
                        <button onClick={() => { setRespondiendo(null); setTexto(''); }}>×</button>
                    </span>
                )}
                <div className='Comentarios-comentar-row'>
                    <input
                        type="text"
                        className='Comentarios-comentar-texto'
                        placeholder='Escribe un comentario...'
                        value={texto}
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