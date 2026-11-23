import { useCallback, useEffect, useState } from 'react';
import '../../style/ChildViews/Itinerarios.css'

import ItinerarioCards from '../../components/ItinerarioCards'

import { useAuth } from '../../context/AuthContext';
import { getItinerarios, crearItinerario, eliminarItinerario } from '../../services/ItinerarioService.js';

export default function Itinerarios({ onSelect }){
    const { user } = useAuth();

    const [itinerarios, setItinerarios] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [query, setQuery] = useState('');

    const cargar = useCallback(async () => {
        if(!user?.id){ setItinerarios([]); setCargando(false); return; }

        try{
            const data = await getItinerarios(user.id);
            if(data.success) setItinerarios(data.itinerarios);
        }
        catch(err){
            console.error('Error al cargar itinerarios:', err);
        }
        finally{
            setCargando(false);
        }
    }, [user?.id]);

    // Se carga al entrar y cada vez que algo cambia (por ejemplo, agregaste un lugar desde el mapa)
    useEffect(() => {
        cargar();
        window.addEventListener('itinerario:cambio', cargar);
        return () => window.removeEventListener('itinerario:cambio', cargar);
    }, [cargar]);

    const filtrados = itinerarios.filter(it =>
        it.nombre.toLowerCase().includes(query.toLowerCase())
    );

    const agregar = async () => {
        if(!user?.id) return;

        try{
            const data = await crearItinerario(user.id);
            if(!data.success) throw new Error(data.error);
            setItinerarios(prev => [data.itinerario, ...prev]);
        }
        catch(err){
            console.error(err);
        }
    };

    const eliminar = async (it) => {
        if(!user?.id) return;

        // Si soy el dueño se elimina para todos; si solo me uní, únicamente salgo de él
        const mensaje = !it.esDuenio
            ? `¿Salir de "${it.nombre}"? Dejará de aparecer en tus itinerarios (a los demás integrantes les sigue existiendo).`
            : it.totalIntegrantes > 1
                ? `¿Eliminar "${it.nombre}" para sus ${it.totalIntegrantes} integrantes, junto con todas sus paradas?`
                : `¿Eliminar "${it.nombre}" y todas sus paradas?`;

        if(!window.confirm(mensaje)) return;

        try{
            const data = await eliminarItinerario(it.id, user.id);
            if(!data.success) throw new Error(data.error);
            setItinerarios(prev => prev.filter(x => x.id !== it.id));
        }
        catch(err){
            console.error(err);
        }
    };

    return(
        <div className='Itinerarios-Container'>

            <div className='Search-And-Add'>
                <input
                    type="search"
                    className='Search-Itinerario'
                    placeholder='Buscar por Nombre ...'
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <button type='button' className='Add-Itinerario' onClick={agregar} title='Nuevo itinerario'>
                    +
                </button>
            </div>

            <div className='Itinerarios-Cards'>
                {filtrados.map(it => (
                    <ItinerarioCards
                        key={it.id}
                        nombre={it.nombre}
                        foto={it.foto}
                        onSelect={() => onSelect?.(it)}
                        onEliminar={() => eliminar(it)}
                    />
                ))}

                {!cargando && filtrados.length === 0 && (
                    <p className='itinerarios-empty'>{user ? 'Sin itinerarios' : 'Inicia sesión para ver tus itinerarios'}</p>
                )}
            </div>

        </div>
    )
}