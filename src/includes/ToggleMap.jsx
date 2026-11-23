import { useNavigate } from 'react-router-dom';

import '../style/includes/ToggleMap.css'

// Pestaña del mapa: mismo diseño que la del chat, pero sin panel.
// Va justo debajo de la del chat y al picarle lleva a /Explore.
export default function ToggleMap() {
    const navigate = useNavigate();

    return(
        <div className='toggle-map'>
            <button
                type="button"
                className="map-eyelash"
                onClick={() => navigate('/Explore')}
                aria-label="Ir al mapa"
                title="Explorar el mapa"
            >
                <svg className="map-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                    <line x1="2" y1="12" x2="22" y2="12" strokeWidth="2"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" strokeWidth="2"/>
                </svg>
            </button>
        </div>
    );
}