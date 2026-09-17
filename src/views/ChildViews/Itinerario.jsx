import { useState } from 'react';
import '../../style/ChildViews/Itinerario.css';

import VenueTag from '../../components/VenueTag';
import AsistentesTag from '../../components/AsistentesTag';

import DefaultFoto_Itinerario from '../../images/Amigos.jpg';
import Editar_Icon from '../../icons/ui/Edit/lapiz (1).png';
import Compartir_Itinerario from '../../icons/ui/venue/rehacer (1).png';
import User_Default from '../../images/Cat.jpg';

// Datos de prueba: las "paradas" del itinerario (luego vienen del backend)
const PARADAS_DEMO = [
    { id: 1, dia: '19 Ago 2026', hora: '12:00 a.m.', agregadoPor: 'UserName' },
    { id: 2, dia: '19 Ago 2026', hora: '12:00 a.m.', agregadoPor: 'UserName' },
    { id: 3, dia: '20 Ago 2026', hora: '3:00 p.m.',  agregadoPor: 'UserName' },
];

export default function Itinerario({ itinerario, onBack }){
    const [paradas] = useState(PARADAS_DEMO);

    return(
        <div className='Itinerario-Container'>

            {/* --- Cabecera --- */}
            <div className='Itinerario-info'>
                <button type='button' className='itinerario-Volver' onClick={onBack} title='Volver'>
                    ‹
                </button>

                <img
                    src={itinerario?.foto || DefaultFoto_Itinerario}
                    alt="Foto"
                    className='itinerario-img'
                />

                <div className='itinerario-name-and-buttons'>
                    <h3 className='itinerario-Name'>{itinerario?.nombre || 'Nombre Itinerario'}</h3>
                    <button type='button' className='itinerario-Compartir' title='Compartir'>
                        <img src={Compartir_Itinerario} alt="compartir" />
                    </button>
                    <button type='button' className='itinerario-Editar' title='Editar'>
                        <img src={Editar_Icon} alt="Editar" />
                    </button>
                </div>
            </div>

            {/* --- Lista de paradas (scrolleable) --- */}
            <div className='Itinerario-List'>
                {paradas.map((parada, i) => (
                    <div className='itinerario-parada' key={parada.id}>

                        <div className='itinerario-Venues'>
                            <AsistentesTag />

                            <VenueTag compact/>

                            <div className='itinerario-fecha'>
                                <p className='txt-dia'>Día</p>
                                <p className='date'>{parada.dia}</p>
                                <p className='txt-hora'>Hora</p>
                                <p className='clock'>{parada.hora}</p>
                            </div>

                            <div className='itinerario-adder'>
                                <p className='Agregado'>Agregado:</p>
                                <img src={User_Default} alt="user-avatar" className='itinerario-user-adder'/>
                                <p className='itinerario-username'>{parada.agregadoPor}</p>
                            </div>
                        </div>

                        {/* Línea de tiempo: número + línea hacia la siguiente parada */}
                        <div className='itinerario-timeline'>
                            <span className='timeline-punto'>{i + 1}</span>
                            {i < paradas.length - 1 && <span className='timeline-linea' />}
                        </div>

                    </div>
                ))}
            </div>

        </div>
    )
}