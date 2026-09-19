import '../style/includes/ShowToPost.css';
import { useRef, useState } from 'react';

import VenueTag from '../components/VenueTag';

import MultimediaIcon from '../icons/ui/chat/multimedia/imagenes (1).png'
import PerfilFoton from '../images/Cat.jpg'

// Solo se aceptan estos tipos de archivo para la multimedia del post
const TIPOS_MIME_PERMITIDOS = ['image/png', 'image/jpeg', 'image/webp', 'video/mp4'];
const EXTENSIONES_PERMITIDAS = ['.png', '.jpg', '.jpeg', '.webp', '.mp4'];

export default function ShowToPost({ onClose = () => {}, onPost = () => {} }){

    const fileInputRef = useRef(null);

    const [texto, setTexto] = useState('');
    const [busquedaVenue, setBusquedaVenue] = useState('');
    const [venueSeleccionado, setVenueSeleccionado] = useState(null);
    const [archivos, setArchivos] = useState([]); // { url, tipo, nombre }

    const handleAbrirExplorador = () => {
        fileInputRef.current?.click();
    };

    const handleArchivosSeleccionados = (e) => {
        const seleccionados = Array.from(e.target.files).filter((archivo) => {
            const extension = '.' + archivo.name.split('.').pop().toLowerCase();
            return TIPOS_MIME_PERMITIDOS.includes(archivo.type) || EXTENSIONES_PERMITIDAS.includes(extension);
        });

        const procesados = seleccionados.map((archivo) => ({
            url: URL.createObjectURL(archivo),
            tipo: archivo.type.startsWith('video') ? 'video' : 'imagen',
            nombre: archivo.name
        }));

        setArchivos(prev => [...prev, ...procesados]);
        e.target.value = ''; // para poder volver a elegir el mismo archivo si lo quita y lo vuelve a poner
    };

    const handleQuitarArchivo = (index) => {
        setArchivos(prev => prev.filter((_, i) => i !== index));
    };

    // Nota: como no tengo tu VenueTag.jsx (para saber cómo trae los datos reales del lugar),
    // aquí simulo la selección: al picarle a la tarjeta de resultado se "elige" ese lugar.
    // Si me pasas VenueTag.jsx te dejo esto conectado a datos reales.
    const handleSeleccionarVenue = () => {
        setVenueSeleccionado(busquedaVenue.trim() || 'Arena Monterrey');
    };

    const handleCambiarVenue = () => {
        setVenueSeleccionado(null);
    };

    const handlePostear = () => {
        if (!venueSeleccionado) return;

        onPost({
            descripcion: texto,
            imagenes: archivos.map((a) => a.url),
            venue: venueSeleccionado
        });
    };

    return(
        <>
        <div className='ToPost-Overlay' onClick={onClose}>
            <div className='ToPost-container' onClick={(e) => e.stopPropagation()}>

                <button className='ToPost-close' onClick={onClose}>x</button>

                <div className='ToPost-Experiencia-txt'>
                    <img src={PerfilFoton} alt="User-Avatar" className='ToPost-user-Avatar' />
                    <input
                        type="text"
                        className='Experiencia-txt'
                        placeholder='Describe tu Experiencia'
                        value={texto}
                        onChange={(e) => setTexto(e.target.value)}
                    />
                </div>

                <div className='ToPost-Venue-visits'>
                    <p className='ToPost-subtitle'>¿A donde Fuiste?</p>

                    {!venueSeleccionado && (
                        <input
                            type="search"
                            className='ToPost-Venue-Search'
                            placeholder='Busca el lugar...'
                            value={busquedaVenue}
                            onChange={(e) => setBusquedaVenue(e.target.value)}
                        />
                    )}

                    {/* Miestras escribe va poniendo la targeta con el nombre aprecido como un dropdwn */}
                    {busquedaVenue.trim() && !venueSeleccionado && (
                        <div className='ToPost-Venue-resultado' onClick={handleSeleccionarVenue}>
                            <VenueTag />
                        </div>
                    )}

                    {venueSeleccionado && (
                        <div className='ToPost-Venue-elegido'>
                            <span>📍 {venueSeleccionado}</span>
                            <button onClick={handleCambiarVenue}>Cambiar</button>
                        </div>
                    )}

                    {!venueSeleccionado && (
                        <p className='ToPost-Venue-aviso'>* Tienes que elegir un lugar para poder postear.</p>
                    )}
                </div>

                {archivos.length > 0 && (
                    <div className={`ToPost-Multimedia-area ${archivos.length > 3 ? 'scrollable' : ''}`}>
                        {/* en esta parte se puede scrollear de foorma horizontal */}
                        {archivos.map((archivo, index) => (
                            <div className='ToPost-Multimedia-item' key={index}>
                                {archivo.tipo === 'video' ? (
                                    <video src={archivo.url} muted />
                                ) : (
                                    <img src={archivo.url} alt={archivo.nombre} />
                                )}
                                <button
                                    className='ToPost-Multimedia-remove'
                                    onClick={() => handleQuitarArchivo(index)}
                                >×</button>
                            </div>
                        ))}
                    </div>
                )}

                <input
                    type="file"
                    ref={fileInputRef}
                    accept='.png,.jpg,.jpeg,.webp,.mp4'
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleArchivosSeleccionados}
                />

                <div className='ToPost-buttom'>
                    <img
                        src={MultimediaIcon} alt="Multimedia" className='ToPost-Multimedia-icon'
                        onClick={handleAbrirExplorador}
                    />
                    <button
                        className='ToPost-btn-Post'
                        onClick={handlePostear}
                        disabled={!venueSeleccionado}
                    >
                        Postear
                    </button>
                </div>

            </div>
        </div>
        </>
    )
}