import { useState } from 'react';

import '../../style/ChildViews/Contacts.css'
import GrupoIcon from '../../icons/ui/chat/usuarios (1).png';
import DefaultFoto from '../../images/Cat.jpg';

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

    // --- Modo "crear grupo" ---
    const [modoGrupo, setModoGrupo] = useState(false);
    const [seleccionados, setSeleccionados] = useState([]);
    const [nombreGrupo, setNombreGrupo] = useState('');

    const contactos = CONTACTOS_DEMO.filter(c =>
        c.username.toLowerCase().includes(query.toLowerCase())
    );

    const estaSeleccionado = (id) => seleccionados.some(c => c.id === id);

    const toggleSeleccion = (contacto) => {
        setSeleccionados(prev =>
            prev.some(c => c.id === contacto.id)
                ? prev.filter(c => c.id !== contacto.id)
                : [...prev, contacto]
        );
    };

    const cancelarGrupo = () => {
        setModoGrupo(false);
        setSeleccionados([]);
        setNombreGrupo('');
    };

    const confirmarGrupo = () => {
        if (seleccionados.length === 0 || !nombreGrupo.trim()) return;

        // TODO: cuando haya backend, aquí se crea el grupo de verdad.
        console.log('Grupo creado:', { nombre: nombreGrupo, miembros: seleccionados });

        cancelarGrupo();
    };

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
                {!modoGrupo && (
                    <button
                        type="button"
                        className='btn-grupo-nuevo'
                        title='Crear grupo'
                        onClick={() => setModoGrupo(true)}
                    >
                        <img src={GrupoIcon} alt="creargrupo" />
                    </button>
                )}
            </div>

            {modoGrupo && (
                <div className='grupo-nuevo-area'>
                    <div className='grupo-seleccionados'>
                        {seleccionados.map(c => (
                            <img
                                key={c.id}
                                src={c.avatar || DefaultFoto}
                                alt={c.username}
                                title={c.username}
                                className='grupo-seleccionado-avatar'
                            />
                        ))}

                        <button
                            type="button"
                            className='btn-grupo-confirmar'
                            title='Crear grupo'
                            disabled={seleccionados.length === 0 || !nombreGrupo.trim()}
                            onClick={confirmarGrupo}
                        >
                            ✓
                        </button>
                    </div>

                    <input
                        type="text"
                        className='grupo-nombre-input'
                        placeholder='Nombre del Grupo'
                        value={nombreGrupo}
                        onChange={(e) => setNombreGrupo(e.target.value)}
                    />
                </div>
            )}

            <div className='Contacts-area'>
                {contactos.map(c => (
                    <ChatTag
                        key={c.id}
                        avatar={c.avatar}
                        username={c.username}
                        lastMessage={c.lastMessage}
                        clock={c.clock}
                        online={c.online}
                        active={c.id === activeId}
                        onClick={() => modoGrupo ? toggleSeleccion(c) : onSelect?.(c)}
                        actionButton={modoGrupo && (
                            <button
                                type="button"
                                className={`chattag-action-btn ${estaSeleccionado(c.id) ? 'is-remove' : 'is-add'}`}
                                onClick={(e) => { e.stopPropagation(); toggleSeleccion(c); }}
                                title={estaSeleccionado(c.id) ? 'Quitar' : 'Agregar'}
                            >
                                {estaSeleccionado(c.id) ? '×' : '+'}
                            </button>
                        )}
                    />
                ))}

                {contactos.length === 0 && (
                    <p className='contacts-empty'>Sin resultados</p>
                )}
            </div>

            {modoGrupo && (
                <button type="button" className='btn-grupo-cancelar' onClick={cancelarGrupo}>
                    Cancelar
                </button>
            )}

        </div>
    );
}