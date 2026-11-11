import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, CircleMarker, Circle, Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet';

import 'leaflet/dist/leaflet.css';
import '../style/Mapa.css'

import NavBar from '../includes/NavBar';
import ToggleChat from '../includes/ToggleChat';
import ToggleItinerario from '../includes/ToggleItinerario';
import VenueTag from '../components/VenueTag';

import { getCategorias, getLugares } from '../services/lugaresService';
import useUbicacion from '../hook/useUbicacion';

// Donde abre el mapa (Monterrey)
const CENTRO_INICIAL = [25.6866, -100.3161];
const ZOOM_INICIAL = 13;

// Más lejos que esto el mapa no pide lugares (serían demasiados para mostrar)
const ZOOM_MINIMO_PARA_CARGAR = 12;

// Espera a que el usuario termine de mover el mapa antes de pedir lugares
const ESPERA_MOVIMIENTO_MS = 350;

// Los mosaicos del mapa. El servidor público de OpenStreetMap es para uso ligero (desarrollo, pruebas).
// Si tu app crece, cambia la url en el .env (VITE_TILES_URL) por un proveedor de mosaicos
// (MapTiler, Stadia, etc.) sin tocar el código. La atribución es OBLIGATORIA por la licencia de OSM.
const TILES_URL = import.meta.env.VITE_TILES_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILES_ATRIBUCION = import.meta.env.VITE_TILES_ATRIBUCION
    || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Orden y nombre de los filtros. Los primeros se ven como botones y el resto en "••• Más".
const ORDEN_GRUPOS = ['comida', 'cultura', 'entretenimiento', 'naturaleza', 'salud', 'compras'];
const ETIQUETAS_GRUPO = {
    comida: 'Comida',
    cultura: 'Cultura',
    entretenimiento: 'Entretenimiento',
    naturaleza: 'Naturaleza',
    salud: 'Salud',
    compras: 'Compras',
};
const GRUPOS_COMO_BOTON = 3;

// Al centrar el mapa en el usuario se acerca al menos hasta este zoom (calle)
const ZOOM_AL_CENTRAR = 16;

// El punto azul del usuario. Es un div (no una imagen), así no hay archivos que se rompan al compilar.
// Los estilos están en Mapa.css (.ubicacion-*).
const ICONO_USUARIO = L.divIcon({
    className: 'ubicacion-icono',
    html: '<span class="ubicacion-pulso"></span><span class="ubicacion-punto"></span>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
});

// Vive dentro del <MapContainer> para poder usar el mapa: avisa cuál es la zona visible
// cada vez que el usuario termina de moverlo o de hacer zoom (y una vez al empezar).
function EscuchaDelMapa({ alCambiarZona }) {
    const mapa = useMap();
    const temporizador = useRef(null);

    const avisar = useCallback(() => {
        clearTimeout(temporizador.current);
        temporizador.current = setTimeout(() => {
            const limites = mapa.getBounds();
            alCambiarZona({
                minLat: limites.getSouth(),
                maxLat: limites.getNorth(),
                minLng: limites.getWest(),
                maxLng: limites.getEast(),
                zoom: mapa.getZoom(),
            });
        }, ESPERA_MOVIMIENTO_MS);
    }, [mapa, alCambiarZona]);

    useMapEvents({ moveend: avisar });

    useEffect(() => {
        avisar();                                   // primera carga
        return () => clearTimeout(temporizador.current);
    }, [avisar]);

    return null;
}

// Dibuja al usuario (punto azul + círculo de precisión) y, si está "siguiendo", mueve el mapa con él.
function UbicacionEnElMapa({ posicion, siguiendo, alMoverElUsuario }) {
    const mapa = useMap();
    const yaCentrado = useRef(false);

    // Si el usuario arrastra el mapa con la mano, deja de seguirlo (si no, el mapa se le regresaría solo)
    useMapEvents({ dragstart: alMoverElUsuario });

    useEffect(() => {
        if (!siguiendo) {
            yaCentrado.current = false;
            return;
        }
        if (!posicion) return;

        const destino = [posicion.lat, posicion.lng];

        if (yaCentrado.current) {
            mapa.panTo(destino);                                    // se movió: el mapa lo acompaña
        } else {
            yaCentrado.current = true;                              // primera vez: vuela hasta él
            mapa.flyTo(destino, Math.max(mapa.getZoom(), ZOOM_AL_CENTRAR));
        }
    }, [mapa, posicion, siguiendo]);

    if (!posicion) return null;

    return (
        <>
            {/* La precisión que reporta el dispositivo (en metros): GPS ~10 m, wifi/antenas puede ser mucho más */}
            <Circle
                center={[posicion.lat, posicion.lng]}
                radius={posicion.precision}
                interactive={false}
                pathOptions={{ color: '#4285f4', weight: 1, fillColor: '#4285f4', fillOpacity: 0.12 }}
            />
            <Marker
                position={[posicion.lat, posicion.lng]}
                icon={ICONO_USUARIO}
                interactive={false}
                keyboard={false}
                zIndexOffset={1000}
            />
        </>
    );
}

export default function Mapa() {
    const [grupoActivo, setGrupoActivo] = useState('todos');
    const [masAbierto, setMasAbierto] = useState(false);
    const masRef = useRef(null);

    const [categorias, setCategorias] = useState([]);
    const [lugares, setLugares] = useState([]);
    const [truncado, setTruncado] = useState(false);
    const [estado, setEstado] = useState('cargando');   // 'cargando' | 'listo' | 'lejos' | 'error'
    const [seleccionadoId, setSeleccionadoId] = useState(null);

    // ---------- Ubicación del usuario ----------
    const [siguiendo, setSiguiendo] = useState(false);      // ¿el mapa lo acompaña al moverse?
    const [avisoCerrado, setAvisoCerrado] = useState(null);

    const { estado: estadoUbicacion, posicion, aviso, iniciar, detener } = useUbicacion({
        alAutoIniciar: () => setSiguiendo(true),            // si ya había dado permiso antes, abre centrado en él
    });

    const ubicacionEncendida = estadoUbicacion === 'buscando' || estadoUbicacion === 'activa';

    // Un solo botón:
    //   apagada      -> empieza a seguirte y centra el mapa
    //   encendida, pero moviste el mapa -> te vuelve a centrar
    //   encendida y centrada -> deja de mostrar tu ubicación
    const alPicarUbicacion = () => {
        if (!ubicacionEncendida) {
            setAvisoCerrado(null);
            setSiguiendo(true);
            iniciar();
        } else if (!siguiendo) {
            setSiguiendo(true);
        } else {
            setSiguiendo(false);
            detener();
        }
    };

    const tituloBotonUbicacion = !ubicacionEncendida
        ? 'Mostrar mi ubicación'
        : siguiendo ? 'Dejar de mostrar mi ubicación' : 'Centrar en mi ubicación';

    const mapaRef = useRef(null);
    const zonaRef = useRef(null);          // última zona visible
    const grupoRef = useRef('todos');      // el grupo activo, para los callbacks del mapa
    const peticionRef = useRef(null);      // para cancelar la petición anterior

    // ---------- Cargar lugares de la zona visible ----------
    const cargarLugares = useCallback(async (zona, grupo) => {
        if (!zona) return;

        peticionRef.current?.abort();      // si había una petición vieja en camino, se cancela

        if (zona.zoom < ZOOM_MINIMO_PARA_CARGAR) {
            setLugares([]);
            setTruncado(false);
            setEstado('lejos');
            return;
        }

        const controlador = new AbortController();
        peticionRef.current = controlador;
        setEstado('cargando');

        try {
            const datos = await getLugares(zona, grupo === 'todos' ? null : [grupo], controlador.signal);
            if (controlador.signal.aborted) return;
            if (!datos.success) throw new Error(datos.error);

            setLugares(datos.lugares);
            setTruncado(datos.truncado);
            setEstado('listo');
        } catch (err) {
            if (err.name === 'AbortError') return;      // la cancelamos nosotros, no es un error
            console.error('Error al cargar lugares:', err);
            setEstado('error');
        }
    }, []);

    const alCambiarZona = useCallback((zona) => {
        zonaRef.current = zona;
        cargarLugares(zona, grupoRef.current);
    }, [cargarLugares]);

    // Al cambiar de filtro se vuelve a pedir lo de la zona que ya se está viendo
    useEffect(() => {
        grupoRef.current = grupoActivo;
        cargarLugares(zonaRef.current, grupoActivo);
    }, [grupoActivo, cargarLugares]);

    // Categorías (para los filtros): una sola vez
    useEffect(() => {
        const controlador = new AbortController();

        getCategorias(controlador.signal)
            .then((datos) => { if (datos.success) setCategorias(datos.categorias); })
            .catch((err) => { if (err.name !== 'AbortError') console.error('Error al cargar categorías:', err); });

        return () => controlador.abort();
    }, []);

    // Al desmontar, cancela lo que esté en camino
    useEffect(() => () => peticionRef.current?.abort(), []);

    // ---------- Filtros ----------
    const gruposDisponibles = (() => {
        const existentes = [...new Set(categorias.map((c) => c.grupo))];
        const conocidos = ORDEN_GRUPOS.filter((g) => existentes.includes(g));
        const otros = existentes.filter((g) => !ORDEN_GRUPOS.includes(g));     // grupos nuevos que agregues a la BD
        return [...conocidos, ...otros];
    })();

    const nombreGrupo = (g) => ETIQUETAS_GRUPO[g] || g;
    const gruposBoton = gruposDisponibles.slice(0, GRUPOS_COMO_BOTON);
    const gruposExtra = gruposDisponibles.slice(GRUPOS_COMO_BOTON);

    const seleccionarFiltro = (grupo) => {
        setGrupoActivo(grupo);
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

    // ---------- Selección (tarjeta <-> marcador) ----------
    const seleccionar = (lugar, { volar = false, desplazarLista = false } = {}) => {
        setSeleccionadoId(lugar.id);

        if (volar && mapaRef.current) {
            mapaRef.current.flyTo([lugar.lat, lugar.lng], Math.max(mapaRef.current.getZoom(), 16));
        }
        if (desplazarLista) {
            document.getElementById(`lugar-${lugar.id}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    };

    return (
        <div className='mapa-layout'>
            <NavBar />
            <ToggleItinerario/>
            <ToggleChat/>

            <div className='mapa-content'>

                <aside className='sidebar'>

                    {/* Filtros */}
                    <div className='filtros-container'>
                        <button
                            className={`filtro-btn ${grupoActivo === 'todos' ? 'active' : ''}`}
                            onClick={() => seleccionarFiltro('todos')}
                        >
                            Todos
                        </button>

                        {gruposBoton.map((grupo) => (
                            <button
                                key={grupo}
                                className={`filtro-btn ${grupoActivo === grupo ? 'active' : ''}`}
                                onClick={() => seleccionarFiltro(grupo)}
                            >
                                {nombreGrupo(grupo)}
                            </button>
                        ))}

                        {gruposExtra.length > 0 && (
                            <div className='filtro-wrapper' ref={masRef}>
                                <button
                                    className={`filtro-btn mas ${masAbierto || gruposExtra.includes(grupoActivo) ? 'active' : ''}`}
                                    onClick={() => setMasAbierto((abierto) => !abierto)}
                                >
                                    ••• Más
                                </button>

                                {masAbierto && (
                                    <div className='filtro-dropdown'>
                                        {gruposExtra.map((grupo) => (
                                            <button
                                                key={grupo}
                                                className={`filtro-dropdown-item ${grupoActivo === grupo ? 'active' : ''}`}
                                                onClick={() => seleccionarFiltro(grupo)}
                                            >
                                                {nombreGrupo(grupo)}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Lista de lugares (los mismos que se ven en el mapa) */}
                    <div className='Lista-Lugares'>
                        {estado === 'error' && (
                            <p className='mapa-aviso mapa-aviso-error'>No se pudieron cargar los lugares. Mueve el mapa para reintentar.</p>
                        )}
                        {estado === 'lejos' && (
                            <p className='mapa-aviso'>Acerca el mapa para ver los lugares de la zona.</p>
                        )}
                        {estado === 'listo' && lugares.length === 0 && (
                            <p className='mapa-aviso'>No hay lugares de esta categoría en la zona que estás viendo.</p>
                        )}

                        {lugares.map((lugar) => (
                            <div id={`lugar-${lugar.id}`} key={lugar.id}>
                                <VenueTag
                                    nombre={lugar.nombre}
                                    categoria={lugar.categoria.nombre}
                                    descripcion={lugar.descripcion || lugar.direccion}
                                    foto={lugar.foto}
                                    color={lugar.categoria.color}
                                    seleccionado={seleccionadoId === lugar.id}
                                    onClick={() => seleccionar(lugar, { volar: true })}
                                />
                            </div>
                        ))}

                        {truncado && (
                            <p className='mapa-aviso'>Hay más lugares en esta zona: acerca el mapa para verlos.</p>
                        )}
                    </div>

                </aside>

                {/* ===== ÁREA DEL MAPA ===== */}
                <main className='mapa-container'>
                    <MapContainer
                        ref={mapaRef}
                        center={CENTRO_INICIAL}
                        zoom={ZOOM_INICIAL}
                        className='mapa-leaflet'
                    >
                        <TileLayer url={TILES_URL} attribution={TILES_ATRIBUCION} />
                        <EscuchaDelMapa alCambiarZona={alCambiarZona} />
                        <UbicacionEnElMapa
                            posicion={posicion}
                            siguiendo={siguiendo}
                            alMoverElUsuario={() => setSiguiendo(false)}
                        />

                        {lugares.map((lugar) => {
                            const elegido = seleccionadoId === lugar.id;

                            return (
                                <CircleMarker
                                    key={lugar.id}
                                    center={[lugar.lat, lugar.lng]}
                                    radius={elegido ? 11 : 7}
                                    pathOptions={{
                                        color: '#ffffff',
                                        weight: elegido ? 3 : 2,
                                        fillColor: lugar.categoria.color,
                                        fillOpacity: 0.95,
                                    }}
                                    eventHandlers={{ click: () => seleccionar(lugar, { desplazarLista: true }) }}
                                >
                                    <Tooltip direction='top' offset={[0, -6]}>{lugar.nombre}</Tooltip>
                                </CircleMarker>
                            );
                        })}
                    </MapContainer>

                    {estado === 'cargando' && <span className='mapa-cargando'>Cargando lugares…</span>}

                    {/* Botón "mi ubicación" */}
                    <button
                        type='button'
                        className={`mapa-btn-ubicacion is-${estadoUbicacion} ${siguiendo && estadoUbicacion === 'activa' ? 'is-siguiendo' : ''}`}
                        onClick={alPicarUbicacion}
                        title={tituloBotonUbicacion}
                        aria-label={tituloBotonUbicacion}
                        aria-pressed={ubicacionEncendida && siguiendo}
                    >
                        <svg viewBox='0 0 24 24' width='22' height='22' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' aria-hidden='true'>
                            <circle cx='12' cy='12' r='6.5' />
                            <circle cx='12' cy='12' r='2.2' fill='currentColor' />
                            <line x1='12' y1='1.5' x2='12' y2='5' />
                            <line x1='12' y1='19' x2='12' y2='22.5' />
                            <line x1='1.5' y1='12' x2='5' y2='12' />
                            <line x1='19' y1='12' x2='22.5' y2='12' />
                        </svg>
                    </button>

                    {aviso && aviso !== avisoCerrado && (
                        <div className='mapa-aviso-ubicacion' role='status'>
                            <span>{aviso}</span>
                            <button type='button' aria-label='Cerrar aviso' onClick={() => setAvisoCerrado(aviso)}>×</button>
                        </div>
                    )}
                </main>

            </div>
        </div>
    );
}