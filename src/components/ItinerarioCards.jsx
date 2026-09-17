import '../style/components/ItinerarioCards.css';

import DefaultFoto_Itinerario from '../images/Amigos.jpg';
import Eliminar_Icon from '../icons/ui/others/basura (1).png';
import Compartir_Itinerario from '../icons/ui/venue/rehacer (1).png';

export default function ItinerarioCards({
    nombre = 'Nombre Itinerario',
    foto,
    onSelect,
    onEliminar,
    onCompartir,
}){
    return(
        <div
            className='Itinerario-Card-Container'
            onClick={onSelect}
            role='button'
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect?.()}
        >
            <img src={foto || DefaultFoto_Itinerario} alt="Foto" className='Itinerario-card-img'/>

            <button
                type='button'
                className='Eliminar-Itinerario-card'
                onClick={(e) => { e.stopPropagation(); onEliminar?.(); }}
                title='Eliminar'
            >
                <img src={Eliminar_Icon} alt="Eliminar" />
            </button>

            <button
                type='button'
                className='Compartir-Itinerario-card'
                onClick={(e) => { e.stopPropagation(); onCompartir?.(); }}
                title='Compartir'
            >
                <img src={Compartir_Itinerario} alt="Compartir" />
            </button>

            <h3 className='itinerario-card-Name'>{nombre}</h3>
        </div>
    )
}