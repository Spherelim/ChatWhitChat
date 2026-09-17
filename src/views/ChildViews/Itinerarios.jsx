import { useState } from 'react';
import '../../style/ChildViews/Itinerarios.css'

import ItinerarioCards from '../../components/ItinerarioCards'

// Datos de prueba (luego los traes del backend)
const ITINERARIOS_DEMO = [
    { id: 1, nombre: 'Nuevo Itinerario', foto: null },
    { id: 2, nombre: 'Nombre de Itinerario', foto: null },
    { id: 3, nombre: 'Nombre de Itinerario', foto: null },
];

let nextId = 100;

export default function Itinerarios({ onSelect }){
    const [itinerarios, setItinerarios] = useState(ITINERARIOS_DEMO);
    const [query, setQuery] = useState('');

    const filtrados = itinerarios.filter(it =>
        it.nombre.toLowerCase().includes(query.toLowerCase())
    );

    const agregar = () => {
        setItinerarios(prev => [
            { id: nextId++, nombre: 'Nuevo Itinerario', foto: null },
            ...prev,
        ]);
    };

    const eliminar = (id) => {
        setItinerarios(prev => prev.filter(it => it.id !== id));
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
                        onEliminar={() => eliminar(it.id)}
                    />
                ))}

                {filtrados.length === 0 && (
                    <p className='itinerarios-empty'>Sin itinerarios</p>
                )}
            </div>

        </div>
    )
}