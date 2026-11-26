import '../style/includes/Call.css';

import DefaultFoto from '../images/Cat.jpg';
import { IconoTelefono, IconoCamara } from './Iconos';

// Aviso de llamada entrante (todavía sin tono de llamada)
//   llamada -> { tipo, grupo, nombre, de: { username, foto } }
export default function LlamadaEntrante({ llamada, onAceptar, onRechazar }){
    const esVideo = llamada.tipo === 'video';

    return(
        <div className='Call-container is-incoming' role='alertdialog' aria-label='Llamada entrante'>
            <div className='in-Call'>
                <div className='call-avatar'>
                    <img src={llamada.de?.foto || DefaultFoto} alt={llamada.de?.username} />
                </div>

                <p className='call-username'>{llamada.de?.username || 'Usuario'}</p>
                <p className='call-status-text'>
                    {llamada.grupo
                        ? `Te invita a ${esVideo ? 'una videollamada' : 'una llamada'} en "${llamada.nombre}"`
                        : (esVideo ? 'Videollamada entrante...' : 'Llamada entrante...')}
                </p>

                <div className='call-controls'>
                    <button type='button' className='call-btn call-btn-decline' onClick={onRechazar} title='Rechazar'>
                        <IconoTelefono />
                    </button>
                    <button type='button' className='call-btn call-btn-accept' onClick={onAceptar} title='Contestar'>
                        {esVideo ? <IconoCamara /> : <IconoTelefono />}
                    </button>
                </div>
            </div>
        </div>
    );
}