import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import NavBar from '../includes/NavBar'
import ToggleChat from '../includes/ToggleChat'
import ToggleMap from '../includes/ToggleMap'
import '../style/Ajustes.css'

import { useAuth } from '../context/AuthContext'
import { getAjustes, guardarAjustes } from '../services/AjustesService'

// Interruptor (encendido / apagado)
function Interruptor({ activo, disabled, onChange, etiqueta }){
    return(
        <button
            type='button'
            role='switch'
            aria-checked={activo}
            aria-label={etiqueta}
            className={`Settings-switch ${activo ? 'is-on' : ''}`}
            disabled={disabled}
            onClick={() => onChange(!activo)}
        >
            <span className='Settings-switch-knob' />
        </button>
    );
}

export default function Ajustes(){
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    // null = todavía cargando
    const [ajustes, setAjustes] = useState(null);
    const [guardando, setGuardando] = useState(null);   // clave del ajuste que se está guardando
    const [error, setError] = useState('');

    // Sin sesión no hay ajustes
    useEffect(() => {
        if(!loading && !user) navigate('/login');
    }, [loading, user, navigate]);

    useEffect(() => {
        if(!user?.id) return;
        let activo = true;

        getAjustes(user.id, user.id)
            .then(data => {
                if(!activo) return;
                if(!data.success) throw new Error(data.error);
                setAjustes(data.ajustes);
            })
            .catch(err => { console.error(err); if(activo) setError('No se pudieron cargar tus ajustes'); });

        return () => { activo = false; };
    }, [user?.id]);

    // Cada cambio se guarda al instante. Si el servidor falla, el interruptor regresa como estaba.
    const cambiar = async (clave, valor) => {
        if(!user?.id || guardando) return;

        const anterior = ajustes[clave];
        setAjustes(prev => ({ ...prev, [clave]: valor }));
        setGuardando(clave);
        setError('');

        try{
            const data = await guardarAjustes(user.id, { [clave]: valor });
            if(!data.success) throw new Error(data.error);
            setAjustes(data.ajustes);
        }
        catch(err){
            console.error(err);
            setAjustes(prev => ({ ...prev, [clave]: anterior }));
            setError(err.message || 'No se pudo guardar el cambio');
        }
        finally{
            setGuardando(null);
        }
    };

    const opcion = (clave, texto, nota) => (
        <div className='Settings-opcion'>
            <div className='Settings-opcion-fila'>
                <p>{texto}</p>
                <Interruptor
                    etiqueta={texto}
                    activo={!!ajustes?.[clave]}
                    disabled={!ajustes || guardando !== null}
                    onChange={(valor) => cambiar(clave, valor)}
                />
            </div>
            {nota && <p className='Settings-nota'>{nota}</p>}
        </div>
    );

    return(
        <>
            <NavBar/>
            <div className='Settings-body'>
                <div className='Settings-contain'>

                    {error && <p className='Settings-error'>{error}</p>}

                    <div className='Settings-Perfil'>
                        <p className='Settings-titulo'>Perfil</p>
                        <div className='Settings-Perfil-Options'>
                            {opcion('mostrarFavoritos', 'Mostrar Lugares Favoritos', !ajustes?.mostrarFavoritos && 'Los demás usuarios no verán tus lugares favoritos.')}
                            {opcion('mostrarInsignias', 'Mostrar Insigneas', !ajustes?.mostrarInsignias && 'Los demás usuarios no verán tus insignias.')}
                        </div>
                    </div>

                    <div className='Settings-Chat'>
                        <p className='Settings-titulo'>Chat</p>
                        <div className='Settings-Chat-Options'>
                            {opcion('encriptarChats', 'Encriptar Chats', ajustes && !ajustes.encriptarChats && 'Tus mensajes nuevos se guardarán SIN cifrar en el servidor.')}
                        </div>
                    </div>

                </div>
            </div>
        </>
    )
}