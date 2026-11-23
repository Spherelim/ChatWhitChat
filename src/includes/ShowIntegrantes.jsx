import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';

import '../style/includes/ShowIntegrantes.css';

import UserTag from '../components/UserTag.jsx';

// Ventana con los integrantes de un itinerario (el dueño + los que se unieron).
//   integrantes  [{ id, username, email, biografia, foto, banner, estado }]
export default function ShowIntegrantes({ integrantes = [], onClose }){
    const { pathname } = useLocation();

    // Si tocas a un integrante te manda a su perfil: la ventana se cierra sola al cambiar de página
    // (se compara con la página donde se abrió; si no, se cerraría apenas se monta)
    const paginaInicial = useRef(pathname);
    useEffect(() => {
        if(pathname !== paginaInicial.current) onClose?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    // Esc para cerrar
    useEffect(() => {
        const alTeclear = (e) => e.key === 'Escape' && onClose?.();
        window.addEventListener('keydown', alTeclear);
        return () => window.removeEventListener('keydown', alTeclear);
    }, [onClose]);

    // Portal a <body>: el panel de itinerarios tiene un "transform" y el position:fixed
    // se quedaría atrapado dentro de él (mismo motivo que ShowItinerarios).
    return createPortal(
        <div className='ShowIntegrantes-backdrop' onClick={onClose}>
            <div className='ShowIntegrantes-container' onClick={(e) => e.stopPropagation()}>

                <button type='button' className='ShowIntegrantes-close' onClick={onClose} title='Cerrar'>
                    x
                </button>

                {/* Se puede scrollear para ver a los demás integrantes */}
                <div className='ShowIntegrantes-lista'>
                    <UserTag users={integrantes} incluirYo />
                </div>

            </div>
        </div>,
        document.body
    );
}