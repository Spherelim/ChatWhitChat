import { useRef } from 'react';
import '../style/components/DropdownMultimedia.css';

import DocumetoIcon from '../icons/ui/chat/multimedia/documento-firmado (2).png';
import ImagenesIcon from '../icons/ui/chat/multimedia/imagenes (2).png';
import ItinerarioIcon from '../icons/ui/chat/multimedia/cheque-de-boleta (2).png';
import AudioIcon from '../icons/ui/chat/multimedia/auriculares (2).png';
import UbicacionIcon from '../icons/ui/chat/multimedia/marcador-de-mapa (2).png';

export default function DropdownMultimedia({ onClose, onArchivo, onUbicacion, onAbrirItinerarios }){
    const inputDocRef = useRef(null);
    const inputMediaRef = useRef(null);
    const inputAudioRef = useRef(null);

    const elegirArchivo = (ref) => ref.current?.click();

    const archivoSeleccionado = (e, tipo) => {
        const file = e.target.files?.[0];
        e.target.value = '';           // permite elegir el mismo archivo otra vez después
        if (file) onArchivo?.(file, tipo);
        onClose?.();
    };

    const compartirUbicacion = () => {
        if (!navigator.geolocation) {
            onClose?.();
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                onUbicacion?.({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                onClose?.();
            },
            () => onClose?.()   // el usuario negó el permiso u ocurrió un error: solo cerramos
        );
    };

    return(
        <div className='DdMultimedia-container'>

            <div className='Multimedia-type-Documentos' onClick={() => elegirArchivo(inputDocRef)}>
                <img src={DocumetoIcon} alt="Documentos" />
                <p>Documentos</p>
            </div>
            <input
                ref={inputDocRef}
                type='file'
                accept='.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt'
                hidden
                onChange={(e) => archivoSeleccionado(e, 'documento')}
            />

            <div className='Multimedia-type-Imagenes' onClick={() => elegirArchivo(inputMediaRef)}>
                <img src={ImagenesIcon} alt="Imagenes" />
                <p>Fotos y Videos</p>
            </div>
            <input
                ref={inputMediaRef}
                type='file'
                accept='image/*,video/*'
                hidden
                onChange={(e) => archivoSeleccionado(e, 'media')}
            />

            <div className='Multimedia-type-Itinerario' onClick={() => { onAbrirItinerarios?.(); onClose?.(); }}>
                <img src={ItinerarioIcon} alt="Itinerario" />
                <p>Itinerario</p>
            </div>

            <div className='Multimedia-type-Audio' onClick={() => elegirArchivo(inputAudioRef)}>
                <img src={AudioIcon} alt="Audio" />
                <p>Audio</p>
            </div>
            <input
                ref={inputAudioRef}
                type='file'
                accept='audio/*'
                hidden
                onChange={(e) => archivoSeleccionado(e, 'audio')}
            />

            <div className='Multimedia-type-Ubicacion' onClick={compartirUbicacion}>
                <img src={UbicacionIcon} alt="Ubicacion" />
                <p>Tú Ubicación</p>
            </div>

        </div>
    )
}