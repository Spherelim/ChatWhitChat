import { useState } from 'react';
import '../style/includes/ToggleItinerario.css'

import ItinerarioImg from '../icons/ui/chat/multimedia/cheque-de-boleta.png';
import Itinerarios from '../views/ChildViews/Itinerarios';
import Itinerario from '../views/ChildViews/Itinerario';

export default function ToggleItinerario(){
    const [open, setOpen] = useState(false);
    const [activeItinerario, setActiveItinerario] = useState(null); // null = lista

    const handleToggle = () => {
        setOpen(prev => {
            if (prev) setActiveItinerario(null);   // al cerrar, resetea la vista
            return !prev;
        });
    };

    return(
        <div className={`Toggle-Itinerario ${open ? 'is-open' : ''} ${activeItinerario ? 'itinerario-open' : ''}`}>

            {/* el panel va PRIMERO: queda pegado al sidebar, la pestaña a su derecha */}
            <div className='itinerario-panel'>
                {activeItinerario ? (
                    <Itinerario
                        itinerario={activeItinerario}
                        onBack={() => setActiveItinerario(null)}
                    />
                ) : (
                    <Itinerarios onSelect={setActiveItinerario} />
                )}
            </div>

            <button
                type='button'
                className='eyelash-itinerario'
                onClick={handleToggle}
                aria-expanded={open}
                aria-label={open ? 'Cerrar itinerario' : 'Abrir itinerario'}
            >
                <img src={ItinerarioImg} alt="Itinerario" className='itinerario-icon'/>
            </button>

        </div>
    )
}