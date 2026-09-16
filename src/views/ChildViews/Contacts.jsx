import { useState } from 'react';

import '../../style/ChildViews/Contacts.css'
import GrupoIcon from '../../icons/ui/chat/usuarios (1).png';

import ChatTag from '../../components/ChatTag';

// Datos de prueba (luego los traes del backend)
const CONTACTOS_DEMO = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    username: `UserName ${i + 1}`,
    lastMessage: 'últ. vez hoy a las 4:32 p.m.',
    clock: '4:32 p.m.',
    online: i % 3 === 0,
}));

export default function Contacts({ collapsed = false, activeId = null, onSelect }){
    const [query, setQuery] = useState('');

    const contactos = CONTACTOS_DEMO.filter(c =>
        c.username.toLowerCase().includes(query.toLowerCase())
    );

    return(
        <div className={`Contacts-container ${collapsed ? 'is-collapsed' : ''}`}>

            <div className='search-area'>
                <input
                    type="search"
                    className='contacts-search'
                    placeholder='Buscar Por Nombre'
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <button type="button" className='btn-grupo-nuevo' title='Crear grupo'>
                    <img src={GrupoIcon} alt="creargrupo" />
                </button>
            </div>

            <div className='Contacts-area'>
                {contactos.map(c => (
                    <ChatTag
                        key={c.id}
                        username={c.username}
                        lastMessage={c.lastMessage}
                        clock={c.clock}
                        online={c.online}
                        active={c.id === activeId}
                        onClick={() => onSelect?.(c)}
                    />
                ))}

                {contactos.length === 0 && (
                    <p className='contacts-empty'>Sin resultados</p>
                )}
            </div>

        </div>
    );
}