import { useEffect, useRef, useState } from 'react';
import '../../style/ChildViews/Itinerario.css';

import VenueTag from '../../components/VenueTag';
import ImageCropper from '../../includes/ImageCropper';
import ShowIntegrantes from '../../includes/ShowIntegrantes';

import { useAuth } from '../../context/AuthContext';
import { getItinerario, guardarItinerario, avisarCambioItinerarios } from '../../services/ItinerarioService.js';

import DefaultFoto_Itinerario from '../../images/Amigos.jpg';
import Editar_Icon from '../../icons/ui/Edit/lapiz (1).png';
import User_Default from '../../images/Cat.jpg';

const formatearFecha = (fechaISO) => {
    if(!fechaISO) return '';
    const fecha = new Date(fechaISO + 'T00:00:00');
    const texto = fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    return texto.replace('.', '');
};

// "2026-11-24 12:45:10" (así lo manda el servidor) -> "24 nov 2026 12:45 p.m."
const formatearFechaHora = (texto) => {
    if(!texto) return '';
    const [dia, hora = ''] = texto.split(' ');
    return `${formatearFecha(dia)} ${formatearHora(hora.slice(0, 5))}`.trim();
};

const formatearHora = (horaISO) => {
    if(!horaISO) return '';
    const [h, m] = horaISO.split(':');
    const hora = parseInt(h, 10);
    const ampm = hora >= 12 ? 'p.m.' : 'a.m.';
    const hora12 = hora % 12 === 0 ? 12 : hora % 12;
    return `${hora12}:${m} ${ampm}`;
};

// itinerario = { id, nombre, foto } (lo que manda la lista)
export default function Itinerario({ itinerario, onBack }){
    const { user } = useAuth();

    // Las paradas: { id, fechaISO, horaISO, lugar, agregadoPor }
    const [paradas, setParadas] = useState([]);
    const [quitadas, setQuitadas] = useState([]);   // ids de paradas que se eliminaron en el modo edición
    const [cargando, setCargando] = useState(true);
    const [duenio, setDuenio] = useState(itinerario?.idUsuario ?? null);

    // Integrantes (el dueño + los que se unieron) y el último cambio que se hizo
    const [integrantes, setIntegrantes] = useState([]);
    const [ultimaMod, setUltimaMod] = useState(null);
    const [mostrarIntegrantes, setMostrarIntegrantes] = useState(false);

    const [editando, setEditando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    // Nombre y foto editables del itinerario
    const [nombreEditado, setNombreEditado] = useState(itinerario?.nombre || 'Nombre Itinerario');
    const [fotoPreview, setFotoPreview] = useState(itinerario?.foto || null);
    const [fotoNueva, setFotoNueva] = useState(null);       // { blob, preview } ya recortada y comprimida
    const [cropperFile, setCropperFile] = useState(null);
    const fotoInputRef = useRef(null);

    // Cualquier integrante puede editar las paradas; el nombre y la foto son solo del dueño
    const esDuenio = !!user && String(duenio) === String(user.id);
    const esIntegrante = esDuenio || (!!user && integrantes.some(i => String(i.id) === String(user.id)));

    // En la cabecera: hasta 4 fotos y un "+N" con los demás (solo si hay más de 1 integrante)
    const MAX_FOTOS = 4;
    const fotosVisibles = integrantes.slice(0, MAX_FOTOS);
    const restantes = integrantes.length - fotosVisibles.length;

    const cargar = async () => {
        if(!itinerario?.id) return;

        try{
            const data = await getItinerario(itinerario.id, user?.id);
            if(!data.success) throw new Error(data.error);

            setDuenio(data.itinerario.idUsuario);
            setIntegrantes(data.integrantes || []);
            setUltimaMod(data.ultimaModificacion || null);
            setNombreEditado(data.itinerario.nombre);
            setFotoPreview(data.itinerario.foto);
            setParadas(data.paradas.map(p => ({
                id: p.id,
                fechaISO: p.dia,
                horaISO: p.hora,
                lugar: p.lugar,
                agregadoPor: p.agregadoPor,
            })));
        }
        catch(err){
            console.error('Error al cargar el itinerario:', err);
        }
        finally{
            setCargando(false);
        }
    };

    // Al abrirlo, y cada vez que se agrega un lugar desde el mapa (si no estoy a media edición)
    useEffect(() => {
        cargar();

        const alCambiar = () => { if(!editando) cargar(); };
        window.addEventListener('itinerario:cambio', alCambiar);
        return () => window.removeEventListener('itinerario:cambio', alCambiar);
    }, [itinerario?.id, user?.id, editando]);

    // ----- Foto -----
    const handleCambiarFoto = (e) => {
        const archivo = e.target.files?.[0];
        e.target.value = '';
        if(!archivo) return;

        if(!archivo.type.startsWith('image/')){
            setError('Ese archivo no es una imagen');
            return;
        }
        setError('');
        setCropperFile(archivo);
    };

    const handleFotoLista = (blob) => {
        if(fotoNueva) URL.revokeObjectURL(fotoNueva.preview);
        setFotoNueva({ blob, preview: URL.createObjectURL(blob) });
        setCropperFile(null);
    };

    // refs para saber qué se está arrastrando y sobre cuál se soltó
    const dragItem = useRef(null);
    const dragOverItem = useRef(null);

    const handleCambiarFecha = (id, campo, valor) => {
        setParadas(prev => prev.map(p => p.id === id ? { ...p, [campo]: valor } : p));
    };

    const handleQuitar = (id) => {
        setParadas(prev => prev.filter(p => p.id !== id));
        setQuitadas(prev => [...prev, id]);
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

    // ----- Editar / Guardar -----
    const handleGuardar = async () => {
        if(esDuenio && !nombreEditado.trim()){
            setError('El itinerario necesita un nombre');
            return;
        }
        if(paradas.some(p => !p.fechaISO || !p.horaISO)){
            setError('Cada parada necesita un día y una hora');
            return;
        }

        setGuardando(true);
        setError('');

        try{
            const data = await guardarItinerario(itinerario.id, {
                idUsuario: user.id,
                nombre: nombreEditado.trim(),
                foto: esDuenio ? fotoNueva?.blob : null,
                paradas: paradas.map(p => ({ id: p.id, dia: p.fechaISO, hora: p.horaISO })),
                quitar: quitadas,
            });

            if(!data.success) throw new Error(data.error);

            setNombreEditado(data.itinerario.nombre);
            setFotoPreview(data.itinerario.foto);
            setFotoNueva(null);
            setQuitadas([]);
            setEditando(false);   // al salir del modo edición se vuelve a cargar (y se actualiza el último cambio)

            avisarCambioItinerarios(); // la lista de itinerarios se actualiza con el nombre/foto nuevos
        }
        catch(err){
            console.error(err);
            setError(err.message || 'No se pudo guardar');
        }
        finally{
            setGuardando(false);
        }
    };

    // El lápiz: la primera vez entra al modo edición, la segunda guarda todo
    const handleEditar = () => {
        if(guardando) return;

        if(editando) handleGuardar();
        else{
            setError('');
            setEditando(true);
        }
    };

    const fotoMostrada = fotoNueva?.preview || fotoPreview || DefaultFoto_Itinerario;

    return(
        <div className='Itinerario-Container'>

            {/* --- Cabecera --- */}
            <div className='Itinerario-info'>
                <button type='button' className='itinerario-Volver' onClick={onBack} title='Volver'>
                    ‹
                </button>

                {/* Fotos de los integrantes (solo si son más de 1). Al tocarlas se abre ShowIntegrantes */}
                {integrantes.length > 1 && (
                    <div
                        className='Itinerario-Integrantes'
                        role='button'
                        tabIndex={0}
                        title='Ver integrantes'
                        onClick={() => setMostrarIntegrantes(true)}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setMostrarIntegrantes(true)}
                    >
                        {restantes > 0 && <span className='integrantes-mas'>+{restantes}</span>}
                        {fotosVisibles.map(u => (
                            <img
                                key={u.id}
                                src={u.foto || User_Default}
                                alt={u.username}
                                className='integrante-foto'
                            />
                        ))}
                    </div>
                )}

                <img
                    src={fotoMostrada}
                    alt="Foto"
                    className={`itinerario-img ${editando && esDuenio ? 'editable' : ''}`}
                    onClick={() => editando && esDuenio && fotoInputRef.current?.click()}
                />

                {editando && esDuenio && (
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
                    {editando && esDuenio ? (
                        <input
                            type="text"
                            className='itinerario-Name-edit'
                            value={nombreEditado}
                            maxLength={100}
                            onChange={(e) => setNombreEditado(e.target.value)}
                            placeholder='Nombre del itinerario'
                        />
                    ) : (
                        <h3 className='itinerario-Name'>{nombreEditado}</h3>
                    )}
                    {esIntegrante && (
                        <button
                            type='button'
                            className={`itinerario-Editar ${editando ? 'activo' : ''}`}
                            title={editando ? 'Guardar cambios' : 'Editar'}
                            onClick={handleEditar}
                            disabled={guardando}
                        >
                            <img src={Editar_Icon} alt="Editar" />
                        </button>
                    )}
                </div>
            </div>

            {/* Mensaje de Modificaciones (la última modificación) */}
            {ultimaMod && (
                <div className='Message-Mod'>
                    <p className='Itinerario-Message'>
                        <strong>{ultimaMod.usuario.username}</strong> {ultimaMod.accion}
                    </p>
                    <p className='Itinerario-Fech-Mod'>{formatearFechaHora(ultimaMod.fecha)}</p>
                </div>
            )}

            {editando && (
                <p className='itinerario-editando-aviso'>
                    {esDuenio
                        ? 'Modo edición: cambia el nombre, la foto, el día/hora de cada parada, o arrástralas (⋮⋮) para reordenarlas.'
                        : 'Modo edición: cambia el día/hora de cada parada, o arrástralas (⋮⋮) para reordenarlas.'}
                    {' '}Cuando termines, toca el lápiz otra vez para guardar.
                </p>
            )}

            {error && <p className='itinerario-error'>{error}</p>}

            {/* --- Lista de paradas (scrolleable) --- */}
            <div className='Itinerario-List'>
                {!cargando && paradas.length === 0 && (
                    <p className='itinerario-vacio'>Todavía no hay lugares. Agrégalos con el botón «Agregar +» de cada lugar en el mapa.</p>
                )}

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

                            <VenueTag
                                compact
                                mostrarAgregar={false}
                                id={parada.lugar.id}
                                nombre={parada.lugar.nombre}
                                categoria={parada.lugar.categoria}
                                descripcion={parada.lugar.descripcion}
                                foto={parada.lugar.foto}
                                color={parada.lugar.color}
                            />

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
                                <img src={parada.agregadoPor?.foto || User_Default} alt="user-avatar" className='itinerario-user-adder'/>
                                <p className='itinerario-username'>{parada.agregadoPor?.username}</p>
                            </div>

                            {editando && (
                                <button
                                    type='button'
                                    className='itinerario-parada-quitar'
                                    title='Quitar del itinerario'
                                    onClick={() => handleQuitar(parada.id)}
                                >
                                    ×
                                </button>
                            )}
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

            {mostrarIntegrantes && (
                <ShowIntegrantes
                    integrantes={integrantes}
                    onClose={() => setMostrarIntegrantes(false)}
                />
            )}

            {cropperFile && (
                <ImageCropper
                    file={cropperFile}
                    aspect={3.5}
                    outWidth={1200}
                    calidad={0.8}
                    titulo='Ajustar foto del itinerario'
                    onDone={handleFotoLista}
                    onCancel={() => setCropperFile(null)}
                />
            )}

        </div>
    )
}