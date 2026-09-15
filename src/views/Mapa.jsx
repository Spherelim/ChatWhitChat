import { useEffect, useRef, useState } from 'react';
import '../style/Mapa.css'

import NavBar from '../includes/NavBar';
import ToggleChat from '../includes/ToggleChat';
import VenueTag from '../components/VenueTag';

// Marcadores de ejemplo. Cuando conectes la API de Google Maps,
// esta misma lista se puede usar para renderizar <Marker /> reales.
const MARCADORES = [
    { nombre: 'Walmart Park', top: '14%', left: '58%', tipo: 'natura' },
    { nombre: 'Hospital Metropolitano', top: '18%', left: '76%', tipo: 'salud' },
    { nombre: 'Mirador del Obispado', top: '55%', left: '32%', tipo: 'atractivo' },
    { nombre: 'Arena Monterrey', top: '52%', left: '61%', tipo: 'atractivo', destacado: true },
    { nombre: 'Macroplaza', top: '68%', left: '46%', tipo: 'atractivo' },
    { nombre: 'Museo de Arte Contemporáneo', top: '73%', left: '47%', tipo: 'atractivo' },
    { nombre: 'Parque Fundidora', top: '58%', left: '69%', tipo: 'natura' },
    { nombre: 'Estadio BBVA', top: '78%', left: '84%', tipo: 'natura' },
    { nombre: 'Multiplaza Lindavista', top: '48%', left: '85%', tipo: 'compras' },
];

const COLOR_TIPO = {
    salud: '#e74c3c',
    atractivo: '#9b59b6',
    natura: '#2fa84f',
    compras: '#2f7fd6',
};

// Etiquetas extra que solo se ven al abrir "••• Más"
const ETIQUETAS_EXTRA = ['Etiqueta 4', 'Etiqueta 5', 'Etiqueta 6'];

export default function Mapa() {
    const [filtroActivo, setFiltroActivo] = useState('Etiqueta 1');
    const [masAbierto, setMasAbierto] = useState(false);
    const masRef = useRef(null);

    const seleccionarFiltro = (etiqueta) => {
        setFiltroActivo(etiqueta);
        setMasAbierto(false);
    };

    useEffect(() => {
        const cerrarSiEsAfuera = (evento) => {
            if (masRef.current && !masRef.current.contains(evento.target)) {
                setMasAbierto(false);
            }
        };
        document.addEventListener('mousedown', cerrarSiEsAfuera);
        return () => document.removeEventListener('mousedown', cerrarSiEsAfuera);
    }, []);

    return (
        <div className='mapa-layout'>
            <NavBar />
            <ToggleChat/>

            <div className='mapa-content'>

                <aside className='sidebar'>

                    {/* Filtros */}
                    <div className='filtros-container'>
                        {['Etiqueta 1', 'Etiqueta 2','Etiqueta 3'].map((etiqueta) => (
                            <button
                                key={etiqueta}
                                className={`filtro-btn ${filtroActivo === etiqueta ? 'active' : ''}`}
                                onClick={() => seleccionarFiltro(etiqueta)}
                            >
                                {etiqueta}
                            </button>
                        ))}

                        <div className='filtro-wrapper' ref={masRef}>
                            <button
                                className={`filtro-btn mas ${masAbierto ? 'active' : ''}`}
                                onClick={() => setMasAbierto((abierto) => !abierto)}
                            >
                                ••• Más
                            </button>

                            {masAbierto && (
                                <div className='filtro-dropdown'>
                                    {ETIQUETAS_EXTRA.map((etiqueta) => (
                                        <button
                                            key={etiqueta}
                                            className={`filtro-dropdown-item ${filtroActivo === etiqueta ? 'active' : ''}`}
                                            onClick={() => seleccionarFiltro(etiqueta)}
                                        >
                                            {etiqueta}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Lista de lugares */}
                    <div className='Lista-Lugares'>
                        <VenueTag />
                        <VenueTag />
                        <VenueTag />
                        <VenueTag />
                        <VenueTag />
                        <VenueTag />
                        <VenueTag />
                        <VenueTag />
                    </div>

                </aside>

                {/* ===== ÁREA DEL MAPA ===== */}
                <main className='mapa-container'>
                    {/* Mapa simulado: reemplazar por <GoogleMap /> cuando la API esté lista */}
                    <div className='mapa-falso'>
                        <div className='mapa-falso-agua' />
                        <div className='mapa-falso-parque' />
                        <div className='mapa-falso-calles' />

                        <span className='mapa-falso-ciudad'>Monterrey</span>

                        {MARCADORES.map((m) => (
                            <div
                                key={m.nombre}
                                className={`mapa-pin ${m.destacado ? 'destacado' : ''}`}
                                style={{ top: m.top, left: m.left }}
                            >
                                <span
                                    className='mapa-pin-punto'
                                    style={{ backgroundColor: COLOR_TIPO[m.tipo] }}
                                />
                                <span className='mapa-pin-etiqueta'>{m.nombre}</span>
                            </div>
                        ))}

                        <span className='mapa-falso-aviso'>Vista previa · Google Maps API próximamente</span>
                    </div>
                </main>

            </div>
        </div>
    );
}