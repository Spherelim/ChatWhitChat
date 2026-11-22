import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import ItinerarioCards from '../components/ItinerarioCards';
import '../style/includes/ShowItinerarios.css';

import { useAuth } from '../context/AuthContext';
import { getItinerarios } from '../services/ItinerarioService';

// Ventana para ELEGIR uno de mis itinerarios (agregar un lugar, enviarlo por el chat...).
//   itinerarios  lista ya cargada (opcional). Si no se pasa, se piden al servidor.
//   titulo       texto del encabezado
export default function ShowItinerarios({ onClose, onSelect, itinerarios: lista = null, titulo = 'Mis Itinerarios' }){
    const { user } = useAuth();

    const [itinerarios, setItinerarios] = useState(lista ?? []);
    const [cargando, setCargando] = useState(lista === null);

    useEffect(() => {
        if(lista !== null) return;
        if(!user?.id){ setCargando(false); return; }

        let activo = true;
        getItinerarios(user.id)
            .then(data => { if(activo && data.success) setItinerarios(data.itinerarios); })
            .catch(err => console.error(err))
            .finally(() => { if(activo) setCargando(false); });

        return () => { activo = false; };
    }, [lista, user?.id]);

    // Se monta con un portal directo a <body>: el chat vive dentro de un
    // contenedor con "transform" (ToggleChat), y eso rompe el position:fixed
    // normal (deja de posicionarse contra la pantalla y se posiciona contra
    // ese contenedor). Con el portal nos salimos de ahí y sí cubrimos todo.
    return createPortal(
        <div className='ShowItinerarios-backdrop' onClick={onClose}>
            <div className='ShowItinerarios-container' onClick={(e) => e.stopPropagation()}>

                <div className='ShowItinerarios-Header'>
                    <p>{titulo}</p>
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

                    {!cargando && itinerarios.length === 0 && (
                        <p className='ShowItinerarios-vacio'>Aún no tienes itinerarios. Crea uno desde el panel de Itinerarios.</p>
                    )}
                </div>

            </div>
        </div>,
        document.body
    );
}