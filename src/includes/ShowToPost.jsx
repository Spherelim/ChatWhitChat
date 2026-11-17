import '../style/includes/ShowToPost.css';
import { useEffect, useRef, useState } from 'react';

import VenueTag from '../components/VenueTag';
import { useAuth } from '../context/AuthContext';
import { buscarLugares, crearPost } from '../services/postService';

import MultimediaIcon from '../icons/ui/chat/multimedia/imagenes (1).png'
import PerfilFoton from '../images/Cat.jpg'

// Solo se aceptan estos tipos de archivo para la multimedia del post
const TIPOS_MIME_PERMITIDOS = ['image/png', 'image/jpeg', 'image/webp', 'video/mp4'];
const EXTENSIONES_PERMITIDAS = ['.png', '.jpg', '.jpeg', '.webp', '.mp4'];
const MAX_ARCHIVOS = 10;
const MAX_MB = 50;

export default function ShowToPost({ onClose = () => {}, onPost = () => {} }){

    const { user } = useAuth();
    const fileInputRef = useRef(null);

    const [texto, setTexto] = useState('');
    const [archivos, setArchivos] = useState([]); // { file, url, tipo, nombre }
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState('');

    // ----- Buscador de lugares -----
    const [busquedaVenue, setBusquedaVenue] = useState('');
    const [resultados, setResultados] = useState([]);
    const [buscando, setBuscando] = useState(false);
    const [venueSeleccionado, setVenueSeleccionado] = useState(null); // { id, nombre }

    // Mientras escribe: espera 200 ms sin teclear, cancela la petición anterior y busca
    useEffect(() => {
        const q = busquedaVenue.trim();

        if (!q || venueSeleccionado) {
            setResultados([]);
            setBuscando(false);
            return;
        }

        setBuscando(true);
        const controller = new AbortController();

        const timer = setTimeout(async () => {
            try {
                const data = await buscarLugares(q, controller.signal);
                if (data.success) setResultados(data.lugares);
            } catch (err) {
                if (err.name !== 'AbortError') console.error(err);
            } finally {
                if (!controller.signal.aborted) setBuscando(false);
            }
        }, 200);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [busquedaVenue, venueSeleccionado]);

    const handleSeleccionarVenue = (lugar) => {
        // se guarda el ID y el nombre REAL del lugar, no lo que escribió el usuario
        setVenueSeleccionado({ id: lugar.id, nombre: lugar.nombre });
        setBusquedaVenue('');
        setResultados([]);
    };

    const handleCambiarVenue = () => setVenueSeleccionado(null);

    // Enter elige el primer resultado
    const handleKeyDownBusqueda = (e) => {
        if (e.key === 'Enter' && resultados.length > 0) {
            e.preventDefault();
            handleSeleccionarVenue(resultados[0]);
        }
    };

    // ----- Multimedia -----
    const handleAbrirExplorador = () => fileInputRef.current?.click();

    const handleArchivosSeleccionados = (e) => {
        const validos = Array.from(e.target.files).filter((archivo) => {
            const extension = '.' + archivo.name.split('.').pop().toLowerCase();
            const tipoOk = TIPOS_MIME_PERMITIDOS.includes(archivo.type) || EXTENSIONES_PERMITIDAS.includes(extension);
            return tipoOk && archivo.size <= MAX_MB * 1024 * 1024;
        });

        if (validos.length < e.target.files.length) {
            setError(`Solo png, jpg, webp o mp4 de máximo ${MAX_MB} MB.`);
        } else {
            setError('');
        }

        setArchivos(prev => {
            const nuevos = validos.slice(0, Math.max(0, MAX_ARCHIVOS - prev.length)).map((file) => ({
                file, // el File real, es el que se manda al servidor
                url: URL.createObjectURL(file),
                tipo: file.type.startsWith('video') ? 'video' : 'imagen',
                nombre: file.name
            }));
            return [...prev, ...nuevos];
        });

        e.target.value = '';
    };

    const handleQuitarArchivo = (index) => {
        setArchivos(prev => {
            URL.revokeObjectURL(prev[index].url);
            return prev.filter((_, i) => i !== index);
        });
    };

    // ----- Postear -----
    const handlePostear = async () => {
        if (!venueSeleccionado || !user?.id || enviando) return;

        setEnviando(true);
        setError('');

        try {
            const data = await crearPost({
                idUsuario: user.id,
                idLugar: venueSeleccionado.id,
                descripcion: texto,
                archivos: archivos.map(a => a.file)
            });

            if (!data.success) throw new Error(data.error);

            archivos.forEach(a => URL.revokeObjectURL(a.url));
            onPost(data.id); // el Menu vuelve a cargar el feed
        }
        catch (err) {
            console.error(err);
            setError(err.message || 'No se pudo publicar. Intenta de nuevo.');
            setEnviando(false);
        }
    };

    return(
        <>
        <div className='ToPost-Overlay' onClick={onClose}>
            <div className='ToPost-container' onClick={(e) => e.stopPropagation()}>

                <button className='ToPost-close' onClick={onClose}>x</button>

                <div className='ToPost-Experiencia-txt'>
                    <img src={user?.foto || PerfilFoton} alt="User-Avatar" className='ToPost-user-Avatar' />
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
                            onKeyDown={handleKeyDownBusqueda}
                            autoComplete='off'
                        />
                    )}

                    {/* Dropdown con scroll: se ven ~2.5 tarjetas compactas */}
                    {busquedaVenue.trim() && !venueSeleccionado && (
                        <div className='ToPost-Venue-lista'>
                            {resultados.map((lugar) => (
                                <VenueTag
                                    key={lugar.id}
                                    compact
                                    nombre={lugar.nombre}
                                    categoria={lugar.categoria || 'Lugar'}
                                    foto={null}
                                    onClick={() => handleSeleccionarVenue(lugar)}
                                />
                            ))}

                            {!buscando && resultados.length === 0 && (
                                <p className='ToPost-Venue-vacio'>No encontramos ese lugar.</p>
                            )}
                            {buscando && resultados.length === 0 && (
                                <p className='ToPost-Venue-vacio'>Buscando...</p>
                            )}
                        </div>
                    )}

                    {venueSeleccionado && (
                        <div className='ToPost-Venue-elegido'>
                            <span>📍 {venueSeleccionado.nombre}</span>
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
                            <div className='ToPost-Multimedia-item' key={archivo.url}>
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

                {error && <p className='ToPost-Venue-aviso'>{error}</p>}

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
                        disabled={!venueSeleccionado || enviando}
                    >
                        {enviando ? 'Publicando...' : 'Postear'}
                    </button>
                </div>

            </div>
        </div>
        </>
    )
}