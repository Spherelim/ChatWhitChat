import { useState } from 'react';
import '../style/components/AsistentesTag.css';

import User_Default from '../images/Cat.jpg';
import Check_icon from '../icons/ui/others/red-social (1).png';

// Datos de prueba (luego vienen del backend)
const ASISTENTES_DEMO = [
    { id: 1, username: 'UserName', email: 'area@gmail.com', avatar: null },
    { id: 2, username: 'UserName', email: 'area@gmail.com', avatar: null },
    { id: 3, username: 'UserName', email: 'area@gmail.com', avatar: null },
    { id: 4, username: 'UserName', email: 'area@gmail.com', avatar: null },
];

export default function AsistentesTag({ asistentes = ASISTENTES_DEMO }){
    const [expanded, setExpanded] = useState(false);   // false = columna de avatares
    const [asistire, setAsistire] = useState(true);    // marca si YO voy a asistir

    const visibles = asistentes.slice(0, 4);
    const restantes = asistentes.length - visibles.length;

    return(
        <div className='AsistentesTag-wrapper'>

            <div
                className={`Asistentes-container ${expanded ? 'is-expanded' : ''}`}
                onClick={() => setExpanded(prev => !prev)}
                role='button'
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setExpanded(p => !p)}
                title={expanded ? 'Ocultar asistentes' : 'Ver asistentes'}
            >
                {expanded && <p className='Asistentes-title'>Asistencia</p>}

                <div className='Asistentes-group'>
                    {expanded ? (
                        asistentes.map(a => (
                            <div className='asistente-row' key={a.id}>
                                <img src={a.avatar || User_Default} alt="user-avatar" className='asistentes-img' />
                                <div className='asistente-info'>
                                    <p className='asistente-username'>{a.username}</p>
                                    <p className='asistente-email'>{a.email}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <>
                            {visibles.map(a => (
                                <img
                                    key={a.id}
                                    src={a.avatar || User_Default}
                                    alt="user-avatar"
                                    className='asistentes-img stacked'
                                />
                            ))}
                            {restantes > 0 && (
                                <span className='asistentes-restantes'>+{restantes}</span>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Marcar / desmarcar mi propia asistencia: rota 180° al desmarcar */}
            <button
                type='button'
                className={`Check-Asistencia ${asistire ? 'is-checked' : ''}`}
                onClick={(e) => { e.stopPropagation(); setAsistire(prev => !prev); }}
                title={asistire ? 'Cancelar asistencia' : 'Confirmar asistencia'}
            >
                <img src={Check_icon} alt="Check" className='like-img'/>
            </button>

        </div>
    );
}