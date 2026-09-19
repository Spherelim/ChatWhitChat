import '../style/includes/ShowMessage.css'

import { useEffect, useRef, useState } from 'react';

const formatearTamano = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const tipoDe = (file) => {
    if (file.type.startsWith('image/')) return 'imagen';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type === 'application/pdf') return 'pdf';
    return 'otro';
};

const extensionDe = (nombre) =>
    nombre.includes('.') ? nombre.split('.').pop().toUpperCase().slice(0, 4) : 'FILE';

// Quiero hacerlo igual como C#, que cuando pueda poner el mensaje y si tiene Botones y el icono
export default function Message({
    titulo = '¿Desea dejar un comentario a cerca del reporte?',
    onClose = () => {}
}){

    const inputFileRef = useRef(null);
    const idRef = useRef(0);

    // Cada archivo: { id, file, tipo, url }  (file es el File real, el que se enviará)
    const [archivos, setArchivos] = useState([]);
    const [mensaje, setMensaje] = useState('');
    const [vista, setVista] = useState(null); // archivo que se está viendo en grande

    // Al cerrar el mensaje se liberan las URLs temporales de la previsualización
    const archivosRef = useRef(archivos);
    useEffect(() => { archivosRef.current = archivos; }, [archivos]);
    useEffect(() => {
        return () => archivosRef.current.forEach(a => URL.revokeObjectURL(a.url));
    }, []);

    const handleSeleccionarArchivos = () => {
        inputFileRef.current?.click();
    };

    const handleArchivosSeleccionados = (e) => {
        const nuevos = Array.from(e.target.files).map(file => ({
            id: idRef.current++,
            file,
            tipo: tipoDe(file),
            url: URL.createObjectURL(file),
        }));
        setArchivos(prev => [...prev, ...nuevos]);
        e.target.value = '';
    };

    const handleQuitarArchivo = (id) => {
        const archivo = archivos.find(a => a.id === id);
        if (archivo) URL.revokeObjectURL(archivo.url);
        setArchivos(prev => prev.filter(a => a.id !== id));
    };

    return(
        <>
        <div className='ShowMessage-Container' onClick={onClose}>
            <div className='ShowMessage-Report' onClick={(e) => e.stopPropagation()}>

                <div className='ShowMessage-Header'>
                    <p>{titulo}</p>
                    <button className='ShowMessage-Close' onClick={onClose}>×</button>
                </div>

                <textarea
                    name="mensaje-reporte"
                    id="report-text"
                    placeholder='Escribe un comentario (opcional)...'
                    value={mensaje}
                    onChange={(e) => setMensaje(e.target.value)}
                />

                <button className='multimedia-report' onClick={handleSeleccionarArchivos}>
                    Subir Archivo Multimedia
                </button>
                <input
                    type="file"
                    multiple
                    ref={inputFileRef}
                    onChange={handleArchivosSeleccionados}
                    style={{ display: 'none' }}
                />

                {archivos.length > 0 && (
                    <p className='ShowMessage-Hint'>Toca un archivo para verlo completo. Usa la × para quitarlo.</p>
                )}

                <div className='Multimedia-send-report'>
                    {/* aqui se puede scrollear de forma horizontal */}
                    {archivos.length === 0 ? (
                        <div className='Archivo-item vacio'>Sin archivos</div>
                    ) : (
                        archivos.map((archivo) => (
                            <div className='Archivo-card' key={archivo.id}>

                                <div
                                    className='Archivo-thumb'
                                    title='Ver archivo'
                                    onClick={() => setVista(archivo)}
                                >
                                    {archivo.tipo === 'imagen' && (
                                        <img src={archivo.url} alt={archivo.file.name} />
                                    )}

                                    {archivo.tipo === 'video' && (
                                        <>
                                            <video src={`${archivo.url}#t=0.1`} preload='metadata' muted playsInline />
                                            <span className='Archivo-play'>▶</span>
                                        </>
                                    )}

                                    {(archivo.tipo === 'audio' || archivo.tipo === 'pdf' || archivo.tipo === 'otro') && (
                                        <span className='Archivo-ext'>{extensionDe(archivo.file.name)}</span>
                                    )}

                                    <button
                                        className='Archivo-quitar'
                                        title='Quitar archivo'
                                        aria-label={`Quitar ${archivo.file.name}`}
                                        onClick={(e) => { e.stopPropagation(); handleQuitarArchivo(archivo.id); }}
                                    >
                                        ×
                                    </button>
                                </div>

                                <p className='Archivo-nombre' title={archivo.file.name}>{archivo.file.name}</p>
                                <p className='Archivo-tamano'>{formatearTamano(archivo.file.size)}</p>

                            </div>
                        ))
                    )}
                </div>

                {/* Cuando se implemente el envío: archivos.map(a => a.file) son los File reales */}
                <button className='btn-enviar-reporte' onClick={onClose}>Reportar</button>

            </div>

            {/* Vista ampliada del archivo (para confirmar que es el correcto) */}
            {vista && (
                <div
                    className='ShowMessage-Preview'
                    onClick={(e) => { e.stopPropagation(); setVista(null); }}
                >
                    <div className='ShowMessage-Preview-box' onClick={(e) => e.stopPropagation()}>

                        <button className='ShowMessage-Preview-close' onClick={() => setVista(null)}>×</button>

                        {vista.tipo === 'imagen' && <img src={vista.url} alt={vista.file.name} />}
                        {vista.tipo === 'video' && <video src={vista.url} controls />}
                        {vista.tipo === 'audio' && <audio src={vista.url} controls />}
                        {vista.tipo === 'pdf' && <iframe className='Preview-pdf' src={vista.url} title={vista.file.name} />}
                        {vista.tipo === 'otro' && (
                            <div className='Preview-otro'>
                                <span className='Archivo-ext'>{extensionDe(vista.file.name)}</span>
                                <p>No se puede previsualizar este tipo de archivo.</p>
                            </div>
                        )}

                        <p className='Preview-nombre'>{vista.file.name}</p>
                        <p className='Preview-tamano'>{formatearTamano(vista.file.size)}</p>

                    </div>
                </div>
            )}
        </div>
        </>
    )
}