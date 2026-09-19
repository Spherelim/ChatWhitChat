import { useState } from 'react';
import { createPortal } from 'react-dom';

import ItinerarioCards from '../components/ItinerarioCards';
import '../style/includes/ShowItinerarios.css';

// Datos de prueba (luego los traes del backend)
const ITINERARIOS_DEMO = [
    { id: 1, nombre: 'Fin de semana en MTY', foto: null },
    { id: 2, nombre: 'Nombre de Itinerario', foto: null },
    { id: 3, nombre: 'Nombre de Itinerario', foto: null },
    { id: 4, nombre: 'Nombre de Itinerario', foto: null },
    { id: 5, nombre: 'Nombre de Itinerario', foto: null },
];

export default function ShowItinerarios({ onClose, onSelect }){
    const [itinerarios] = useState(ITINERARIOS_DEMO);

    // Se monta con un portal directo a <body>: el chat vive dentro de un
    // contenedor con "transform" (ToggleChat), y eso rompe el position:fixed
    // normal (deja de posicionarse contra la pantalla y se posiciona contra
    // ese contenedor). Con el portal nos salimos de ahí y sí cubrimos todo.
    return createPortal(
        <div className='ShowItinerarios-backdrop' onClick={onClose}>
            <div className='ShowItinerarios-container' onClick={(e) => e.stopPropagation()}>

                <div className='ShowItinerarios-Header'>
                    <p>Mis Itinerarios</p>
                    <button
                        type='button'
                        className='ShowItinerarios-close'
                        onClick={onClose}
                        title='Cancelar'
                    >
                        ×
                    </button>
                </div>

                <div className='ShowItinerarios-itinerarios'>
                    {itinerarios.map(it => (
                        <ItinerarioCards
                            key={it.id}
                            nombre={it.nombre}
                            foto={it.foto}
                            onSelect={() => onSelect?.(it)}
                        />
                    ))}
                </div>

            </div>
        </div>,
        document.body
    );
}