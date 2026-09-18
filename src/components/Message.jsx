import '../style/components/Message.css';

const MARCA_ESTADO = {
    seen: '✓✓',
    sent: '✓',
    pending: '',
    error: '',
};

/*
  type   -> 'texto' (default) | 'ubicacion' | 'archivo' | 'itinerario'
  own    -> true si lo mandé yo, false si lo recibí
  status -> 'seen' | 'sent' | 'error' | 'pending'  (solo aplica si own === true)
*/
export default function Message({
    type = 'texto',
    text = 'Hola',
    clock = '00:00 p.m.',
    own = false,
    status = 'sent',
    lat,
    lng,
    archivoNombre,
    archivoTipo,
    itinerarioNombre,
}){
    const esMedia = type !== 'texto';

    const clasesBurbuja = [
        'Message-container',
        own ? 'is-own' : 'is-received',
        own ? `is-${status}` : '',
        esMedia ? 'is-media' : '',
    ].join(' ');

    return(
        <div className={`Message-row ${own ? 'row-own' : 'row-received'}`}>
            <div className={clasesBurbuja}>

                {type === 'texto' && (
                    <p className='message-text'>{text}</p>
                )}

                {type === 'ubicacion' && (
                    <div className='message-ubicacion'>
                        {/* Mapa de relleno mientras no haya API key de Google Maps.
                            Con la key, cambia esto por un <img> apuntando a:
                            https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=220x130&markers=${lat},${lng}&key=TU_API_KEY */}
                        <div className='message-mapa-falso'>
                            <span className='message-pin'>📍</span>
                        </div>
                        <p className='message-ubicacion-label'>Ubicación en tiempo real</p>
                    </div>
                )}

                {type === 'archivo' && (
                    <div className='message-archivo'>
                        <span className='message-archivo-icono'>📎</span>
                        <div className='message-archivo-info'>
                            <p className='message-archivo-nombre'>{archivoNombre}</p>
                            <p className='message-archivo-tipo'>{archivoTipo}</p>
                        </div>
                    </div>
                )}

                {type === 'itinerario' && (
                    <div className='message-itinerario'>
                        <span className='message-itinerario-icono'>🗒️</span>
                        <p className='message-itinerario-nombre'>{itinerarioNombre}</p>
                    </div>
                )}

                <div className='message-meta'>
                    <p className='message-clock'>{clock}</p>
                    {own && <span className='message-check'></span>}
                </div>

            </div>
        </div>
    );
}