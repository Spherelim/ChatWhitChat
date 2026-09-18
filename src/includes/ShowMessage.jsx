import '../style/includes/ShowMessage.css'

import { useRef, useState } from 'react';

// Quiero hacerlo igual como C#, que cuando pueda poner el mensaje y si tiene Botones y el icono
export default function Message({
    titulo = '¿Desea dejar un comentario a cerca del reporte?',
    onClose = () => {}
}){

    const inputFileRef = useRef(null);
    const [archivos, setArchivos] = useState([]);
    const [mensaje, setMensaje] = useState('');

    const handleSeleccionarArchivos = () => {
        inputFileRef.current?.click();
    };

    const handleArchivosSeleccionados = (e) => {
        const nuevos = Array.from(e.target.files);
        setArchivos(prev => [...prev, ...nuevos]);
        e.target.value = '';
    };

    const handleQuitarArchivo = (index) => {
        setArchivos(prev => prev.filter((_, i) => i !== index));
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

                <div className='Multimedia-send-report'>
                    {/* aqui se puede scrollear de forma horizontal */}
                    {archivos.length === 0 ? (
                        <div className='Archivo-item vacio'>Sin archivos</div>
                    ) : (
                        archivos.map((archivo, index) => (
                            <div
                                className='Archivo-item'
                                key={index}
                                title={archivo.name}
                                onClick={() => handleQuitarArchivo(index)}
                            >
                                {archivo.name.length > 12 ? archivo.name.slice(0, 10) + '…' : archivo.name}
                            </div>
                        ))
                    )}
                </div>

                <button className='btn-enviar-reporte' onClick={onClose}>Reportar</button>

            </div>
        </div>
        </>
    )
}