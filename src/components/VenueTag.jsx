import '../style/components/VenueTag.css'

import { useEffect, useRef, useState } from 'react';

import { useFavoritos } from '../services/FavoritosService.js';
import { useAuth } from '../context/AuthContext';
import { getItinerarios, agregarParada, quitarParada, avisarCambioItinerarios } from '../services/ItinerarioService.js';
import ShowItinerarios from '../includes/ShowItinerarios';

import FavoritoIcon_Default from '../icons/ui/venue/estrella (2).png';
import FavoritoIcon_Active from '../icons/ui/venue/estrella (1).png';
import Compartir from '../icons/ui/venue/rehacer (1).png';


// Los valores por defecto son los de siempre (Arena Monterrey), así los lugares donde ya usas
// <VenueTag/> sin props se ven exactamente igual. En el mapa se le pasan los datos reales.
export default function VenueTag({
    id = null,              // ID_Lugar. Con id, la estrella se guarda en la BD; sin id es solo de adorno
    compact = false,
    nombre = 'Arena Monterrey',
    categoria = 'Sala de Conciertos',
    descripcion = 'La Arena Monterrey es un estadio cubierto de arena en Monterrey, Nuevo León, México. Es principalmente usada para conciertos, espectáculos y shows de entretenimiento.',
    foto = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/La_Arena_Mty.jpg/3840px-La_Arena_Mty.jpg?utm_source=es.wikipedia.org&utm_campaign=index&utm_content=thumbnail',
    color = null,           // color de la categoría (se usa cuando el lugar no tiene foto)
    seleccionado = false,   // resalta la tarjeta (lo usa el mapa)
    mostrarAgregar = true,  // false = sin el botón "Agregar +" (dentro de un itinerario no tiene sentido)
    onClick,                // si se pasa, la tarjeta es clicable
}){

    const { user } = useAuth();

    // ----- Agregar a un itinerario -----
    const [agregadoA,setAgregadoA] = useState(null);      // { idItinerario, idParada } cuando ya lo agregué
    const [agregarLocal,setAgregarLocal] = useState(false); // solo para los <VenueTag/> de ejemplo (sin id)
    const [eligiendo,setEligiendo] = useState(null);      // lista de mis itinerarios (abre ShowItinerarios)
    const [ocupado,setOcupado] = useState(false);
    const [aviso,setAviso] = useState('');
    const temporizador = useRef(null);

    const agregar = id ? !!agregadoA : agregarLocal;      // true = el botón dice "Eliminar -"

    useEffect(() => () => clearTimeout(temporizador.current), []);

    const mostrarAviso = (texto) => {
        setAviso(texto);
        clearTimeout(temporizador.current);
        temporizador.current = setTimeout(() => setAviso(''), 2500);
    };

    const { esFavorito, alternar } = useFavoritos();
    const [favoritoLocal,setFavoritoLocal] = useState(false); // solo para los <VenueTag/> de ejemplo (sin id)
    const favorito = id ? esFavorito(id) : favoritoLocal;
    const [fotoFallo,setFotoFallo] = useState(false);   // la foto no cargó (link roto, sin internet...)

    // stopPropagation: picarle a un botón no debe contar como picarle a la tarjeta
    // Guarda el lugar en el itinerario elegido
    const agregarAItinerario = async (itinerario) => {
        setEligiendo(null);
        setOcupado(true);

        try{
            const data = await agregarParada(itinerario.id, user.id, id);
            if(!data.success) throw new Error(data.error);

            setAgregadoA({ idItinerario: itinerario.id, idParada: data.parada.id });
            mostrarAviso(`Agregado a «${itinerario.nombre}»`);
            avisarCambioItinerarios();
        }
        catch(err){
            console.error(err);
            mostrarAviso(err.message || 'No se pudo agregar');
        }
        finally{
            setOcupado(false);
        }
    };

    const quitarDelItinerario = async () => {
        setOcupado(true);

        try{
            const data = await quitarParada(agregadoA.idItinerario, agregadoA.idParada, user.id);
            if(!data.success) throw new Error(data.error);

            setAgregadoA(null);
            mostrarAviso('Quitado del itinerario');
            avisarCambioItinerarios();
        }
        catch(err){
            console.error(err);
            mostrarAviso(err.message || 'No se pudo quitar');
        }
        finally{
            setOcupado(false);
        }
    };

    const handleAgregar = async (e)=> {
        e.stopPropagation();

        if(!id){ setAgregarLocal(prev => !prev); return; }   // VenueTag de ejemplo
        if(ocupado) return;
        if(!user?.id){ mostrarAviso('Inicia sesión para agregar lugares'); return; }

        if(agregadoA){ quitarDelItinerario(); return; }

        // Mis itinerarios: 0 -> aviso | 1 -> se guarda directo ahí | varios -> se elige en ShowItinerarios
        setOcupado(true);
        let lista;
        try{
            const data = await getItinerarios(user.id);
            if(!data.success) throw new Error(data.error);
            lista = data.itinerarios;
        }
        catch(err){
            console.error(err);
            mostrarAviso('No se pudieron cargar tus itinerarios');
            setOcupado(false);
            return;
        }
        setOcupado(false);

        if(lista.length === 0) mostrarAviso('Crea un itinerario primero');
        else if(lista.length === 1) agregarAItinerario(lista[0]);
        else setEligiendo(lista);
    };

    const handleFavorito = (e)=> {
        e.stopPropagation();
        if(id) alternar(id);
        else setFavoritoLocal(prev => !prev);
    };

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

                    {mostrarAgregar ? (
                        <button className={agregar ? 'btn-delete' : 'btn-add'}
                        onClick={handleAgregar} disabled={ocupado}>{agregar ? 'Eliminar -' : 'Agregar +'}</button>
                    ) : <span />}

                </div>

                {aviso && <span className='venue-aviso'>{aviso}</span>}

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

            {/* El modal vive en un portal, pero sus clics suben por React hasta la tarjeta: se cortan aquí */}
            {eligiendo && (
                <div onClick={(e) => e.stopPropagation()}>
                    <ShowItinerarios
                        itinerarios={eligiendo}
                        titulo='Agregar a un itinerario'
                        onClose={() => setEligiendo(null)}
                        onSelect={agregarAItinerario}
                    />
                </div>
            )}

        </div>
        // Targeta del lugar
    );
}