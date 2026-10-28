import '../style/components/VenueTag.css'

import { useState } from 'react';

import FavoritoIcon_Default from '../icons/ui/venue/estrella (2).png';
import FavoritoIcon_Active from '../icons/ui/venue/estrella (1).png';
import Compartir from '../icons/ui/venue/rehacer (1).png';


// Los valores por defecto son los de siempre (Arena Monterrey), así los lugares donde ya usas
// <VenueTag/> sin props se ven exactamente igual. En el mapa se le pasan los datos reales.
export default function VenueTag({
    compact = false,
    nombre = 'Arena Monterrey',
    categoria = 'Sala de Conciertos',
    descripcion = 'La Arena Monterrey es un estadio cubierto de arena en Monterrey, Nuevo León, México. Es principalmente usada para conciertos, espectáculos y shows de entretenimiento.',
    foto = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/La_Arena_Mty.jpg/3840px-La_Arena_Mty.jpg?utm_source=es.wikipedia.org&utm_campaign=index&utm_content=thumbnail',
    color = null,           // color de la categoría (se usa cuando el lugar no tiene foto)
    seleccionado = false,   // resalta la tarjeta (lo usa el mapa)
    onClick,                // si se pasa, la tarjeta es clicable
}){

    const [agregar,setAgregar] = useState(false);
    const [favorito,setFavorito] = useState(false);
    const [fotoFallo,setFotoFallo] = useState(false);   // la foto no cargó (link roto, sin internet...)

    // stopPropagation: picarle a un botón no debe contar como picarle a la tarjeta
    const handleAgregar = (e)=> { e.stopPropagation(); setAgregar(prev => !prev); };

    const handleFavorito = (e)=> { e.stopPropagation(); setFavorito(prev => !prev); };

    return(
        <div
            className={`Venues-grid ${compact ? 'compact' : ''} ${seleccionado ? 'is-selected' : ''} ${onClick ? 'is-clickable' : ''}`}
            onClick={onClick}
        >

            <div className='venue-look'>
                {foto && !fotoFallo ? (
                    <img src={foto}
                    alt="FotoLugar"
                    className='venue-img'
                    loading='lazy'
                    onError={() => setFotoFallo(true)}
                    />
                ) : (
                    // Sin foto: un fondo con el color de la categoría
                    <div
                        className='venue-sin-foto'
                        style={color ? { background: `linear-gradient(135deg, ${color}, #2a4a5e)` } : undefined}
                    />
                )}

                <div className='venue-reaction'>

                    <img src={favorito ?  FavoritoIcon_Active : FavoritoIcon_Default} alt="favorito"
                    className='btn-favorite' onClick={handleFavorito}/>

                    <button className={agregar ? 'btn-delete' : 'btn-add'}
                    onClick={handleAgregar}>{agregar ? 'Eliminar -' : 'Agregar +'}</button>

                </div>

                {/* Ahora el encabezado va DENTRO de la foto, pegado abajo */}
                <div className='venue-header'>
                    <h3 className='venue-name'>{nombre}</h3>
                    <p className='venue-tag'>{categoria}</p>
                    {/* <img src={Compartir} alt="compartir" className='btn-compartir' /> */}
                </div>
            </div>

            {descripcion && (
                <div className='venue-info'>
                    <div className='venue-description'>
                        <p>{descripcion}</p>
                    </div>
                </div>
            )}

        </div>
        // Targeta del lugar
    );
}