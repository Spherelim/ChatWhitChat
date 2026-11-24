import { useEffect, useState } from 'react';
import '../style/components/Message.css';

import DefaultFoto_Itinerario from '../images/Amigos.jpg';
import { urlArchivo } from '../services/Chatservice.js';

import { useAuth } from '../context/AuthContext.jsx';
import { iconoDeArchivo, extensionDe } from '../utils/iconosArchivo.js';
import { getResumenItinerario, unirseItinerario, avisarCambioItinerarios } from '../services/ItinerarioService.js';

/*
  type   -> 'texto' (default) | 'media' (foto/video) | 'documento' | 'audio' | 'ubicacion' | 'itinerario'
  own    -> true si lo mandé yo, false si lo recibí
  status -> 'seen' | 'sent' | 'error' | 'pending'  (solo aplica si own === true)

  Archivos:   url (la del servidor), previewLocal (blob: mientras se sube), nombre, mime, size
  Documentos: paginas (PDF/Word = páginas, PowerPoint = diapositivas), preview (miniatura del PDF en el servidor),
              miniaturaLocal (la misma miniatura mientras se sube)
  Ubicación:  lat, lng
  Itinerario: itinerarioId, nombre, foto  (nombre y foto se refrescan solos desde el servidor)
  onMediaLoad -> se llama cuando una foto/video termina de cargar (para que el chat baje el scroll)
*/

const EXTENSIONES_VIDEO = ['mp4', 'webm', 'mov'];

const extension = extensionDe;

const esVideo = (mime, nombre) =>
    mime ? mime.startsWith('video/') : EXTENSIONES_VIDEO.includes(extension(nombre));

// 96 kB, 1.4 MB...
const formatearTamano = (bytes) => {
    if(!bytes) return '';
    if(bytes < 1024) return `${bytes} B`;
    if(bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// "9 páginas" / "1 página" / "12 diapositivas"
const textoPaginas = (paginas, ext) => {
    if(!paginas) return '';
    if(ext === 'pptx') return `${paginas} ${paginas === 1 ? 'diapositiva' : 'diapositivas'}`;
    return `${paginas} ${paginas === 1 ? 'página' : 'páginas'}`;
};

// ---------- Enlaces y correos dentro de un mensaje de texto ----------
// Solo se reconocen http(s)://, www. y correos; así nunca se arma un "javascript:" ni nada raro.
const PATRON_ENLACE = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)|([A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/gi;

// Los signos al final ("mira https://x.com.") no son parte del enlace
const separarPuntuacion = (texto) => {
    const m = texto.match(/[.,;:!?)\]}]+$/);
    return m ? [texto.slice(0, -m[0].length), m[0]] : [texto, ''];
};

function TextoConEnlaces({ texto = '' }){
    const partes = [];
    let ultimo = 0;

    for(const m of texto.matchAll(PATRON_ENLACE)){
        const [bruto] = m;
        const [coincidencia, cola] = separarPuntuacion(bruto);

        if(m.index > ultimo) partes.push(texto.slice(ultimo, m.index));

        if(m[1]){
            const href = coincidencia.startsWith('www.') ? `https://${coincidencia}` : coincidencia;
            partes.push(
                <a key={m.index} className='message-enlace' href={href} target='_blank' rel='noopener noreferrer nofollow'>
                    {coincidencia}
                </a>
            );
        }
        else{
            partes.push(
                <a key={m.index} className='message-enlace' href={`mailto:${coincidencia}`}>
                    {coincidencia}
                </a>
            );
        }

        if(cola) partes.push(cola);
        ultimo = m.index + bruto.length;
    }

    if(ultimo < texto.length) partes.push(texto.slice(ultimo));
    return <>{partes}</>;
}

// ---------- Documento: tarjeta con icono, nombre, páginas y peso (y vista previa si es PDF) ----------
function TarjetaDocumento({ src, nombre, size, paginas, miniatura, onMediaLoad }){
    const ext = extension(nombre);
    const icono = iconoDeArchivo(nombre);
    const detalle = [textoPaginas(paginas, ext), ext ? ext.toUpperCase() : 'Archivo', formatearTamano(size)]
        .filter(Boolean).join(' • ');

    return(
        <a
            className='message-doc'
            href={src}
            target='_blank'
            rel='noopener noreferrer'
            download={nombre}
            title={ext === 'pdf' ? 'Abrir PDF' : 'Descargar'}
        >
            {miniatura && (
                <img className='message-doc-preview' src={miniatura} alt='' onLoad={onMediaLoad} />
            )}

            <div className='message-doc-fila'>
                {icono
                    ? <img className='message-doc-icono' src={icono} alt={ext} />
                    : <span className='message-archivo-icono'>📎</span>}

                <div className='message-archivo-info'>
                    <p className='message-doc-nombre'>{nombre}</p>
                    <p className='message-archivo-tipo'>{detalle}</p>
                </div>
            </div>
        </a>
    );
}

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
    paginas,
    preview,
    miniaturaLocal,
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

    // --- Ubicación: mapa de OpenStreetMap (no necesita API key) ---
    const delta = 0.004;
    const mapaSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}&layer=mapnik&marker=${lat}%2C${lng}`;
    const mapaEnlace = `https://www.google.com/maps?q=${lat},${lng}`;

    return(
        <div className={`Message-row ${own ? 'row-own' : 'row-received'}`}>
            <div className={clasesBurbuja}>

                {/* Los enlaces (https://..., www...) y los correos se pueden tocar */}
                {type === 'texto' && (
                    <p className='message-text'><TextoConEnlaces texto={text} /></p>
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
                    <TarjetaDocumento
                        src={src}
                        nombre={nombre}
                        size={size}
                        paginas={paginas}
                        miniatura={miniaturaLocal || (preview ? urlArchivo(preview) : null)}
                        onMediaLoad={onMediaLoad}
                    />
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