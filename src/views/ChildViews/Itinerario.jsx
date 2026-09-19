import { useRef, useState } from 'react';
import '../../style/ChildViews/Itinerario.css';

import VenueTag from '../../components/VenueTag';
import AsistentesTag from '../../components/AsistentesTag';

import DefaultFoto_Itinerario from '../../images/Amigos.jpg';
import Editar_Icon from '../../icons/ui/Edit/lapiz (1).png';
import Compartir_Itinerario from '../../icons/ui/venue/rehacer (1).png';
import User_Default from '../../images/Cat.jpg';

// Datos de prueba: las "paradas" del itinerario (luego vienen del backend)
// fechaISO / horaISO son los valores "crudos" que usan los <input date/time>;
// dia/hora (formateados) se calculan a partir de esos para mostrarlos bonito.
const PARADAS_DEMO = [
    { id: 1, fechaISO: '2026-08-19', horaISO: '00:00', agregadoPor: 'UserName' },
    { id: 2, fechaISO: '2026-08-19', horaISO: '00:00', agregadoPor: 'UserName' },
    { id: 3, fechaISO: '2026-08-20', horaISO: '15:00', agregadoPor: 'UserName' },
];

const formatearFecha = (fechaISO) => {
    if(!fechaISO) return '';
    const fecha = new Date(fechaISO + 'T00:00:00');
    const texto = fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    return texto.replace('.', '');
};

const formatearHora = (horaISO) => {
    if(!horaISO) return '';
    const [h, m] = horaISO.split(':');
    const hora = parseInt(h, 10);
    const ampm = hora >= 12 ? 'p.m.' : 'a.m.';
    const hora12 = hora % 12 === 0 ? 12 : hora % 12;
    return `${hora12}:${m} ${ampm}`;
};

export default function Itinerario({ itinerario, onBack }){
    const [paradas, setParadas] = useState(PARADAS_DEMO);
    const [editando, setEditando] = useState(false);

    // Nombre y foto editables del itinerario
    const [nombreEditado, setNombreEditado] = useState(itinerario?.nombre || 'Nombre Itinerario');
    const [fotoPreview, setFotoPreview] = useState(itinerario?.foto || null);
    const fotoInputRef = useRef(null);

    const handleCambiarFoto = (e) => {
        const archivo = e.target.files?.[0];
        if(archivo) setFotoPreview(URL.createObjectURL(archivo));
        e.target.value = '';
    };

    // refs para saber qué se está arrastrando y sobre cuál se soltó
    const dragItem = useRef(null);
    const dragOverItem = useRef(null);

    const handleEditar = () => setEditando(prev => !prev);

    const handleCambiarFecha = (id, campo, valor) => {
        setParadas(prev => prev.map(p => p.id === id ? { ...p, [campo]: valor } : p));
    };

    const handleDragStart = (index) => {
        dragItem.current = index;
    };

    const handleDragEnter = (index) => {
        dragOverItem.current = index;
    };

    const handleDragEnd = () => {
        if(dragItem.current === null || dragOverItem.current === null) return;

        const copia = [...paradas];
        const [arrastrada] = copia.splice(dragItem.current, 1);
        copia.splice(dragOverItem.current, 0, arrastrada);

        dragItem.current = null;
        dragOverItem.current = null;

        setParadas(copia);
    };

    return(
        <div className='Itinerario-Container'>

            {/* --- Cabecera --- */}
            <div className='Itinerario-info'>
                <button type='button' className='itinerario-Volver' onClick={onBack} title='Volver'>
                    ‹
                </button>

                <img
                    src={fotoPreview || DefaultFoto_Itinerario}
                    alt="Foto"
                    className={`itinerario-img ${editando ? 'editable' : ''}`}
                    onClick={() => editando && fotoInputRef.current?.click()}
                />

                {editando && (
                    <div className='itinerario-img-overlay' onClick={() => fotoInputRef.current?.click()}>
                        <img src={Editar_Icon} alt="Cambiar foto" className='itinerario-img-overlay-icon'/>
                        <span>Cambiar foto</span>
                    </div>
                )}

                <input
                    type="file"
                    accept="image/*"
                    ref={fotoInputRef}
                    style={{ display: 'none' }}
                    onChange={handleCambiarFoto}
                />

                <div className='itinerario-name-and-buttons'>
                    {editando ? (
                        <input
                            type="text"
                            className='itinerario-Name-edit'
                            value={nombreEditado}
                            onChange={(e) => setNombreEditado(e.target.value)}
                            placeholder='Nombre del itinerario'
                        />
                    ) : (
                        <h3 className='itinerario-Name'>{nombreEditado}</h3>
                    )}
                    <button type='button' className='itinerario-Compartir' title='Compartir'>
                        <img src={Compartir_Itinerario} alt="compartir" />
                    </button>
                    <button
                        type='button'
                        className={`itinerario-Editar ${editando ? 'activo' : ''}`}
                        title={editando ? 'Terminar edición' : 'Editar'}
                        onClick={handleEditar}
                    >
                        <img src={Editar_Icon} alt="Editar" />
                    </button>
                </div>
            </div>

            {editando && (
                <p className='itinerario-editando-aviso'>
                    Modo edición: cambia el nombre, la foto, la fecha/hora de cada parada, o arrástralas (⋮⋮) para reordenarlas.
                </p>
            )}

            {/* --- Lista de paradas (scrolleable) --- */}
            <div className='Itinerario-List'>
                {paradas.map((parada, i) => (
                    <div
                        className='itinerario-parada'
                        key={parada.id}
                        draggable={editando}
                        onDragStart={() => handleDragStart(i)}
                        onDragEnter={() => handleDragEnter(i)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                    >

                        <div className='itinerario-Venues'>
                            <AsistentesTag />

                            <VenueTag compact/>

                            <div className='itinerario-fecha'>
                                {editando ? (
                                    <div className='itinerario-fecha-edit'>
                                        <input
                                            type='date'
                                            className='itinerario-input-fecha'
                                            value={parada.fechaISO}
                                            onChange={(e) => handleCambiarFecha(parada.id, 'fechaISO', e.target.value)}
                                        />
                                        <input
                                            type='time'
                                            className='itinerario-input-hora'
                                            value={parada.horaISO}
                                            onChange={(e) => handleCambiarFecha(parada.id, 'horaISO', e.target.value)}
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <p className='txt-dia'>Día</p>
                                        <p className='date'>{formatearFecha(parada.fechaISO)}</p>
                                        <p className='txt-hora'>Hora</p>
                                        <p className='clock'>{formatearHora(parada.horaISO)}</p>
                                    </>
                                )}
                            </div>

                            <div className='itinerario-adder'>
                                <p className='Agregado'>Agregado:</p>
                                <img src={User_Default} alt="user-avatar" className='itinerario-user-adder'/>
                                <p className='itinerario-username'>{parada.agregadoPor}</p>
                            </div>
                        </div>

                        {editando && (
                            <div className='itinerario-drag-handle' title='Arrastra para reordenar'>
                                ⋮⋮
                            </div>
                        )}

                        {/* Línea de tiempo: número + línea hacia la siguiente parada */}
                        <div className='itinerario-timeline'>
                            <span className='timeline-punto'>{i + 1}</span>
                            {i < paradas.length - 1 && <span className='timeline-linea' />}
                        </div>

                    </div>
                ))}
            </div>

        </div>
    )
}