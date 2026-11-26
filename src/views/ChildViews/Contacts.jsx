import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import '../../style/ChildViews/Contacts.css'
import GrupoIcon from '../../icons/ui/chat/usuarios (1).png';
import DefaultFoto from '../../images/Cat.jpg';

import ChatTag from '../../components/ChatTag';

import { useAuth } from '../../context/AuthContext.jsx';
import { getFollowing } from '../../services/authService';
import { conectarSocket } from '../../services/Socket.js';
import { usePresencia } from '../../hook/usePresencia.js';
import { getConversaciones, crearGrupo } from '../../services/Chatservice.js';

// Datos de prueba (luego los traes del backend)
// const CONTACTOS_DEMO = Array.from({ length: 15 }, (_, i) => ({
//     id: i,
//     username: `UserName ${i + 1}`,
//     lastMessage: 'últ. vez hoy a las 4:32 p.m.',
//     clock: '4:32 p.m.',
//     online: i % 3 === 0,
// }));

export default function Contacts({ collapsed = false, activeId = null, onSelect }){
    const { user } = useAuth();

    const [query, setQuery] = useState('');
    const [contactos, setContactos] = useState([]);
    const [conversaciones, setConversaciones] = useState([]);   // mis chats (privados y grupos) con no leídos

    // Contactos = los Usuarios a los que sigo
    const cargarContactos = useCallback(async () => {
        if(!user?.id){
            setContactos([]);
            return;
        }

        try{
            const data = await getFollowing(user.id);

            if(data.success){
                setContactos(data.users.map(u => ({
                    id: u.id,
                    username: u.username,
                    avatar: u.foto || DefaultFoto,
                    online: u.estado === 'Activo',
                    // Todavía no hay mensajes en el backend: de momento muestro el estado
                    lastMessage: u.estado === 'Activo' ? 'En línea' : 'Desconectado',
                })));
            }
        }
        catch(err){
            console.error('Error al cargar contactos:', err);
        }
    }, [user?.id]);

    useEffect(() => {
        cargarContactos();

        // authService avisa con este evento cuando sigues/dejas de seguir a alguien
        window.addEventListener('contactos:actualizar', cargarContactos);
        return () => window.removeEventListener('contactos:actualizar', cargarContactos);
    }, [cargarContactos]);

    // Mis chats: de aquí salen los grupos y cuántos mensajes nuevos tengo en cada uno
    const cargarConversaciones = useCallback(async () => {
        if(!user?.id){
            setConversaciones([]);
            return;
        }

        try{
            const data = await getConversaciones(user.id);
            if(data.success) setConversaciones(data.conversaciones);
        }
        catch(err){
            console.error('Error al cargar los chats:', err);
        }
    }, [user?.id]);

    useEffect(() => {
        cargarConversaciones();
    }, [cargarConversaciones]);

    // Tiempo real: mensajes nuevos, me agregaron a un grupo, ya leí un chat
    useEffect(() => {
        if(!user?.id) return;

        const socket = conectarSocket(user.id);

        const alRecibir = (m) => {
            if(m.remitenteId === user.id) return;

            setConversaciones(prev => {
                const conv = prev.find(c => c.conversacionId === m.conversacionId);
                if(!conv){
                    // chat que no conocía (alguien me escribió por 1ra vez): se vuelve a pedir la lista
                    cargarConversaciones();
                    return prev;
                }

                // si ya lo tengo abierto y lo estoy viendo, el Chat lo marca leído solo
                const abierto = (conv.tipo === 'grupo' ? `g-${conv.conversacionId}` : conv.otroId) === activeIdRef.current;
                if(abierto && document.visibilityState === 'visible') return prev;

                return prev.map(c => c.conversacionId === m.conversacionId ? { ...c, noLeidos: c.noLeidos + 1 } : c);
            });
        };

        const alLeer = (d) => {
            if(d.lectorId !== user.id) return;
            setConversaciones(prev => prev.map(c => c.conversacionId === d.conversacionId ? { ...c, noLeidos: 0 } : c));
        };

        socket.on('mensaje:nuevo', alRecibir);
        socket.on('conversacion:leida', alLeer);
        socket.on('conversacion:nueva', cargarConversaciones);
        socket.io.on('reconnect', cargarConversaciones);

        return () => {
            socket.off('mensaje:nuevo', alRecibir);
            socket.off('conversacion:leida', alLeer);
            socket.off('conversacion:nueva', cargarConversaciones);
            socket.io.off('reconnect', cargarConversaciones);
        };
    }, [user?.id, cargarConversaciones]);

    // --- Modo "crear grupo" ---
    const [modoGrupo, setModoGrupo] = useState(false);
    const [seleccionados, setSeleccionados] = useState([]);
    const [nombreGrupo, setNombreGrupo] = useState('');
    const [creandoGrupo, setCreandoGrupo] = useState(false);
    const [errorGrupo, setErrorGrupo] = useState('');

    // El listener del socket necesita saber qué chat está abierto sin volver a suscribirse cada vez
    const activeIdRef = useRef(activeId);
    activeIdRef.current = activeId;

    // Quién está en línea ahora mismo (contactos + gente que me escribió)
    const idsPresencia = useMemo(() => [
        ...contactos.map(c => c.id),
        ...conversaciones.filter(c => c.tipo === 'privada' && c.otroId != null).map(c => c.otroId),
    ], [contactos, conversaciones]);
    const enLinea = usePresencia(idsPresencia, user?.id);
    const textoEstado = (id) => enLinea.has(id) ? 'En línea' : 'Desconectado';

    // Lista final: grupos primero, luego mis contactos y los chats con gente que no sigo
    const lista = useMemo(() => {
        const privadas = conversaciones.filter(c => c.tipo === 'privada');
        const noLeidosDe = (id) => privadas.find(c => c.otroId === id)?.noLeidos ?? 0;

        const grupos = conversaciones
            .filter(c => c.tipo === 'grupo')
            .map(c => ({
                id: `g-${c.conversacionId}`,
                esGrupo: true,
                conversacionId: c.conversacionId,
                username: c.nombre,
                miembros: c.miembros,
                avatars: c.miembros.map(m => m.foto || DefaultFoto),
                lastMessage: `${c.miembros.length} integrantes`,
                noLeidos: c.noLeidos,
            }));

        const personas = contactos.map(c => ({
            ...c,
            online: enLinea.has(c.id),
            lastMessage: textoEstado(c.id),
            noLeidos: noLeidosDe(c.id),
        }));

        // Alguien que no sigo pero me escribió: igual tiene que aparecer
        const ids = new Set(contactos.map(c => c.id));
        const extra = privadas
            .filter(c => c.otroId != null && !ids.has(c.otroId))
            .map(c => {
                const otro = c.miembros.find(m => m.id === c.otroId);
                return {
                    id: otro.id,
                    username: otro.username,
                    avatar: otro.foto || DefaultFoto,
                    online: enLinea.has(otro.id),
                    lastMessage: textoEstado(otro.id),
                    noLeidos: c.noLeidos,
                };
            });

        return [...grupos, ...personas, ...extra];
    }, [conversaciones, contactos, enLinea]);   // eslint-disable-line react-hooks/exhaustive-deps

    // Con el modo grupo activo solo se escogen personas
    const visibles = lista.filter(c =>
        (!modoGrupo || (!c.esGrupo && contactos.some(x => x.id === c.id))) &&
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
        setErrorGrupo('');
    };

    const confirmarGrupo = async () => {
        if (!user?.id || creandoGrupo || seleccionados.length === 0 || !nombreGrupo.trim()) return;

        setCreandoGrupo(true);
        setErrorGrupo('');

        try{
            const data = await crearGrupo(user.id, nombreGrupo.trim(), seleccionados.map(c => c.id));
            if(!data.success) throw new Error(data.error);

            await cargarConversaciones();
            cancelarGrupo();

            // Se abre el grupo recién creado
            if(data.grupo){
                onSelect?.({
                    id: `g-${data.conversacionId}`,
                    esGrupo: true,
                    conversacionId: data.conversacionId,
                    username: data.grupo.nombre,
                    miembros: data.grupo.miembros,
                    avatars: data.grupo.miembros.map(m => m.foto || DefaultFoto),
                });
            }
        }
        catch(err){
            setErrorGrupo(err.message || 'No se pudo crear el grupo');
        }
        finally{
            setCreandoGrupo(false);
        }
    };

    return(
        <div className={`Contacts-container ${collapsed ? 'is-collapsed' : ''}`}>

            <div className='search-area'>
                <input
                    type="search"
                    className='contacts-search'
                    placeholder='Buscar Usuario...'
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
                            disabled={creandoGrupo || seleccionados.length === 0 || !nombreGrupo.trim()}
                            onClick={confirmarGrupo}
                        >
                            ✓
                        </button>
                    </div>

                    <input
                        type="text"
                        className='grupo-nombre-input'
                        placeholder='Nombre del Grupo...'
                        value={nombreGrupo}
                        maxLength={60}
                        onChange={(e) => setNombreGrupo(e.target.value)}
                    />
                    {errorGrupo && <p className='grupo-error'>{errorGrupo}</p>}
                </div>
            )}

            <div className='Contacts-area'>
                {visibles.map(c => (
                    <ChatTag
                        key={c.id}
                        avatar={c.avatar}
                        avatars={c.avatars}
                        username={c.username}
                        lastMessage={c.lastMessage}
                        clock={c.clock}
                        unread={c.noLeidos > 0}
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

                {visibles.length === 0 && (
                    <p className='contacts-empty'>
                        {query ? 'Sin resultados' : 'Aún no sigues a nadie'}
                    </p>
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