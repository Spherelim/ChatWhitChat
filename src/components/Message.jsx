import { useEffect, useState } from 'react';
import '../style/components/Message.css';

import DefaultFoto_Itinerario from '../images/Amigos.jpg';
import { urlArchivo } from '../services/Chatservice.js';

import { useAuth } from '../context/AuthContext.jsx';
import { getResumenItinerario, unirseItinerario, avisarCambioItinerarios } from '../services/ItinerarioService.js';

/*
  type   -> 'texto' (default) | 'media' (foto/video) | 'documento' | 'audio' | 'ubicacion' | 'itinerario'
  own    -> true si lo mandé yo, false si lo recibí
  status -> 'seen' | 'sent' | 'error' | 'pending'  (solo aplica si own === true)

  Archivos:   url (la del servidor), previewLocal (blob: mientras se sube), nombre, mime, size
  Ubicación:  lat, lng
  Itinerario: itinerarioId, nombre, foto  (nombre y foto se refrescan solos desde el servidor)
  onMediaLoad -> se llama cuando una foto/video termina de cargar (para que el chat baje el scroll)
*/

const EXTENSIONES_VIDEO = ['mp4', 'webm', 'mov'];

const extension = (nombre = '') => nombre.split('.').pop().toLowerCase();

const esVideo = (mime, nombre) =>
    mime ? mime.startsWith('video/') : EXTENSIONES_VIDEO.includes(extension(nombre));

// Icono y nombre legible según la extensión del documento
const TIPOS_DOCUMENTO = {
    pdf:  { icono: '📕', etiqueta: 'PDF' },
    doc:  { icono: '📘', etiqueta: 'Word' },
    docx: { icono: '📘', etiqueta: 'Word' },
    xls:  { icono: '📗', etiqueta: 'Excel' },
    xlsx: { icono: '📗', etiqueta: 'Excel' },
    ppt:  { icono: '📙', etiqueta: 'PowerPoint' },
    pptx: { icono: '📙', etiqueta: 'PowerPoint' },
    txt:  { icono: '📄', etiqueta: 'Texto' },
};

const formatearTamano = (bytes) => {
    if(!bytes) return '';
    if(bytes < 1024) return `${bytes} B`;
    if(bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// La foto del itinerario ya viene como URL completa desde el servidor; si llegara una ruta relativa se arma con urlArchivo
const fotoItinerario = (foto) => {
    if(!foto) return DefaultFoto_Itinerario;
    return /^(https?:|blob:|data:)/.test(foto) ? foto : urlArchivo(foto);
};

// Tarjeta de un itinerario compartido en el chat.
// Pide al servidor el nombre/foto ACTUALES y si yo ya soy integrante:
//   - si todavía no lo soy, al pasar el mouse aparece "+ Unirse" y al tocarlo me agrego a mis itinerarios
//   - si ya lo soy (o es mío), no aparece nada, así no se puede agregar 2 veces
function TarjetaItinerario({ itinerarioId, nombre, foto, onMediaLoad }){
    const { user } = useAuth();

    const [info, setInfo] = useState(null);                  // { nombre, foto } según el servidor
    const [existe, setExiste] = useState(true);
    const [soyIntegrante, setSoyIntegrante] = useState(null); // null = todavía no sé
    const [uniendo, setUniendo] = useState(false);

    useEffect(() => {
        if(!itinerarioId) return;

        let activo = true;
        const cargar = async () => {
            try{
                const data = await getResumenItinerario(itinerarioId, user?.id);
                if(!activo || !data.success) return;

                setExiste(data.existe !== false);
                if(data.existe !== false){
                    setInfo(data.itinerario);
                    setSoyIntegrante(!!data.esIntegrante);
                }
            }
            catch(err){
                // sin conexión: se queda con lo que traía el mensaje
            }
        };

        cargar();
        window.addEventListener('itinerario:cambio', cargar);
        return () => { activo = false; window.removeEventListener('itinerario:cambio', cargar); };
    }, [itinerarioId, user?.id]);

    const puedeUnirse = !!user?.id && !!itinerarioId && existe && soyIntegrante === false;

    const unirse = async () => {
        if(!puedeUnirse || uniendo) return;

        setUniendo(true);
        try{
            const data = await unirseItinerario(itinerarioId, user.id);
            if(!data.success) throw new Error(data.error);

            setSoyIntegrante(true);
            avisarCambioItinerarios();   // para que aparezca en la lista de Itinerarios
        }
        catch(err){
            console.error('No se pudo unir al itinerario:', err);
        }
        finally{
            setUniendo(false);
        }
    };

    return(
        <div
            className={`message-itinerario ${puedeUnirse ? 'puede-unirse' : ''}`}
            onClick={puedeUnirse ? unirse : undefined}
            role={puedeUnirse ? 'button' : undefined}
            tabIndex={puedeUnirse ? 0 : undefined}
            onKeyDown={puedeUnirse ? (e) => (e.key === 'Enter' || e.key === ' ') && unirse() : undefined}
        >
            <div className='message-itinerario-portada'>
                <img
                    className='message-itinerario-foto'
                    src={fotoItinerario(!existe ? null : info ? info.foto : foto)}
                    alt=''
                    onLoad={onMediaLoad}
                />
                {puedeUnirse && (
                    <span className='message-itinerario-unirse'>{uniendo ? 'Uniéndote...' : '+ Unirse'}</span>
                )}
            </div>

            <div className='message-itinerario-info'>
                <p className='message-itinerario-etiqueta'>🗒️ Itinerario compartido</p>
                <p className='message-itinerario-nombre'>
                    {!existe ? 'Este itinerario ya no está disponible' : info ? info.nombre : nombre}
                </p>
            </div>
        </div>
    );
}

export default function Message({
    type = 'texto',
    text = 'Hola',
    clock = '00:00 p.m.',
    own = false,
    status = 'sent',
    url,
    previewLocal,
    nombre,
    mime,
    size,
    lat,
    lng,
    foto,
    itinerarioId,
    contenido,
    onMediaLoad,
}){
    const esMedia = type !== 'texto';

    const clasesBurbuja = [
        'Message-container',
        own ? 'is-own' : 'is-received',
        own ? `is-${status}` : '',
        esMedia ? 'is-media' : '',
    ].join(' ');

    // Mientras se sube se enseña la copia local; ya subido, la del servidor
    const src = previewLocal || urlArchivo(url);

    const infoDocumento = TIPOS_DOCUMENTO[extension(nombre)] || { icono: '📎', etiqueta: 'Archivo' };

    // --- Ubicación: mapa de OpenStreetMap (no necesita API key) ---
    const delta = 0.004;
    const mapaSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}&layer=mapnik&marker=${lat}%2C${lng}`;
    const mapaEnlace = `https://www.google.com/maps?q=${lat},${lng}`;

    return(
        <div className={`Message-row ${own ? 'row-own' : 'row-received'}`}>
            <div className={clasesBurbuja}>

                {type === 'texto' && (
                    <p className='message-text'>{text}</p>
                )}

                {/* ---------- Foto / Video ---------- */}
                {type === 'media' && (
                    esVideo(mime, nombre) ? (
                        <video
                            className='message-video'
                            src={`${src}#t=0.1`}
                            controls
                            preload='metadata'
                            playsInline
                            onLoadedMetadata={onMediaLoad}
                        />
                    ) : (
                        <a className='message-media-link' href={src} target='_blank' rel='noopener noreferrer' title={nombre}>
                            <img
                                className='message-imagen'
                                src={src}
                                alt={nombre || 'imagen'}
                                loading='lazy'
                                onLoad={onMediaLoad}
                            />
                        </a>
                    )
                )}

                {/* ---------- Audio ---------- */}
                {type === 'audio' && (
                    <div className='message-audio-bloque'>
                        <audio className='message-audio' src={src} controls preload='metadata' />
                        <p className='message-archivo-nombre'>{nombre}</p>
                    </div>
                )}

                {/* ---------- Documento ---------- */}
                {type === 'documento' && (
                    <a
                        className='message-archivo message-documento'
                        href={src}
                        target='_blank'
                        rel='noopener noreferrer'
                        download={nombre}
                        title='Abrir / descargar'
                    >
                        <span className='message-archivo-icono'>{infoDocumento.icono}</span>
                        <div className='message-archivo-info'>
                            <p className='message-archivo-nombre'>{nombre}</p>
                            <p className='message-archivo-tipo'>
                                {[infoDocumento.etiqueta, formatearTamano(size)].filter(Boolean).join(' · ')}
                            </p>
                        </div>
                    </a>
                )}

                {/* ---------- Ubicación ---------- */}
                {type === 'ubicacion' && (
                    <a className='message-ubicacion' href={mapaEnlace} target='_blank' rel='noopener noreferrer' title='Abrir en Google Maps'>
                        <div className='message-mapa'>
                            <iframe
                                title='Mapa de la ubicación'
                                src={mapaSrc}
                                loading='lazy'
                                tabIndex={-1}
                                referrerPolicy='no-referrer'
                                sandbox='allow-scripts allow-same-origin'
                            />
                        </div>
                        <p className='message-ubicacion-label'>
                            📍 {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}
                        </p>
                    </a>
                )}

                {/* ---------- Itinerario ---------- */}
                {type === 'itinerario' && (
                    <TarjetaItinerario
                        itinerarioId={itinerarioId ?? contenido?.itinerarioId}
                        nombre={nombre ?? contenido?.nombre}
                        foto={foto ?? contenido?.foto}
                        onMediaLoad={onMediaLoad}
                    />
                )}

                <div className='message-meta'>
                    <p className='message-clock'>{clock}</p>
                    {/*own && <span className='message-check'>{MARCA_ESTADO[status]}</span>*/}
                </div>

            </div>
        </div>
    );
}