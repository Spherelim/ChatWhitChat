import '../style/components/VenueTag.css'

import { useState } from 'react';

import FavoritoIcon_Default from '../icons/ui/venue/estrella (2).png';
import FavoritoIcon_Active from '../icons/ui/venue/estrella (1).png';
import Compartir from '../icons/ui/venue/rehacer (1).png';


export default function VenueTag(){

    const [agregar,setAgregar] = useState(false);
    const [favorito,setFavorito] = useState(false);


    const handleAgregar = ()=> setAgregar(prev => !prev);

    const handleFavorito = ()=> setFavorito(prev => !prev);

    return(
        <div className='Venues-grid'>

            <div className='venue-look'>
                <img src="https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/La_Arena_Mty.jpg/3840px-La_Arena_Mty.jpg?utm_source=es.wikipedia.org&utm_campaign=index&utm_content=thumbnail"
                alt="FotoLugar"
                className='venue-img'
                />

                <div className='venue-reaction'>

                    <img src={favorito ?  FavoritoIcon_Active : FavoritoIcon_Default} alt="favorito"
                    className='btn-favorite' onClick={handleFavorito}/>

                    <button className={agregar ? 'btn-delete' : 'btn-add'}
                    onClick={handleAgregar}>{agregar ? 'Eliminar -' : 'Agregar +'}</button>

                </div>
            </div>

            <div className='venue-info'>
                <div className='venue-header'>
                    <h3 className='venue-name'>Arena Monterrey</h3>
                    <p className='venue-tag'>Sala de Conciertos</p>
                    <img src={Compartir} alt="compartir" className='btn-compartir' />
                </div>

                <div className='venue-description'>
                    <p>La Arena Monterrey es un estadio cubierto de arena en Monterrey,
                    Nuevo León, México. Es principalmente usada para conciertos,
                    espectáculos y shows de entretenimiento.</p>
                </div>
            </div>

        </div>
        // Targeta del lugar
    );
}