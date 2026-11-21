import '../style/includes/ImageCropper.css';
import { useEffect, useRef, useState } from 'react';

// Ventana para acomodar una imagen antes de subirla:
//  - arrastras para moverla y con el slider (o la rueda del mouse) le haces zoom
//  - al aceptar se recorta EXACTO lo que ves y se comprime a WebP (pesa ~50-150 KB)
//
// Props:
//   file      File elegido en el <input type="file">
//   aspect    ancho / alto del recorte (1 = cuadrado, 4 = banner 4:1)
//   outWidth  ancho final en px (el alto sale de aspect)
//   circle    true = se ve el marco redondo (para el avatar)
//   calidad   0-1, calidad del WebP
//   onDone(blob)   onCancel()
export default function ImageCropper({
    file, aspect = 1, outWidth = 400, circle = false, calidad = 0.82,
    titulo = 'Ajustar imagen', onDone, onCancel,
}) {
    const FRAME_W = aspect >= 2 ? 520 : 300;          // tamaño del marco en pantalla
    const FRAME_H = Math.round(FRAME_W / aspect);
    const outHeight = Math.round(outWidth / aspect);

    const [img, setImg] = useState(null);
    const [error, setError] = useState('');
    const [zoom, setZoom] = useState(1);
    const [off, setOff] = useState({ x: 0, y: 0 });   // movimiento desde el centro (px del marco)
    const [guardando, setGuardando] = useState(false);

    const drag = useRef(null);

    // Carga la imagen elegida
    useEffect(() => {
        // "activo" evita que una carga vieja (ya cancelada) marque error.
        // En desarrollo React ejecuta el efecto dos veces: la primera URL se revoca y su
        // onerror llegaba tarde y ponía el mensaje de error aunque la segunda sí cargaba.
        let activo = true;
        const url = URL.createObjectURL(file);
        const el = new Image();
        el.onload = () => { if (activo) setImg(el); };
        el.onerror = () => { if (activo) setError('No se pudo leer esa imagen. Prueba con un JPG, PNG o WebP.'); };
        el.src = url;
        return () => { activo = false; URL.revokeObjectURL(url); };
    }, [file]);

    // "cover": con zoom 1 la imagen ya llena todo el marco
    const base = img ? Math.max(FRAME_W / img.naturalWidth, FRAME_H / img.naturalHeight) : 1;
    const scale = base * zoom;

    // Evita que se vea espacio vacío: la imagen siempre tiene que cubrir el marco
    const limitar = (o, s = scale) => {
        if (!img) return o;
        const maxX = Math.max(0, (img.naturalWidth * s - FRAME_W) / 2);
        const maxY = Math.max(0, (img.naturalHeight * s - FRAME_H) / 2);
        return { x: Math.min(maxX, Math.max(-maxX, o.x)), y: Math.min(maxY, Math.max(-maxY, o.y)) };
    };

    const cambiarZoom = (z) => {
        const nuevo = Math.min(4, Math.max(1, z));
        setZoom(nuevo);
        setOff(o => limitar(o, base * nuevo));
    };

    const onPointerDown = (e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, y: e.clientY, off };
    };
    const onPointerMove = (e) => {
        if (!drag.current) return;
        setOff(limitar({
            x: drag.current.off.x + (e.clientX - drag.current.x),
            y: drag.current.off.y + (e.clientY - drag.current.y),
        }));
    };
    const onPointerUp = () => { drag.current = null; };

    const onWheel = (e) => cambiarZoom(zoom - e.deltaY * 0.002);

    const aceptar = () => {
        if (!img || guardando) return;
        setGuardando(true);

        const canvas = document.createElement('canvas');
        canvas.width = outWidth;
        canvas.height = outHeight;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingQuality = 'high';

        // Qué parte de la imagen original queda dentro del marco
        const left = FRAME_W / 2 + off.x - (img.naturalWidth * scale) / 2;
        const top = FRAME_H / 2 + off.y - (img.naturalHeight * scale) / 2;
        ctx.drawImage(img, -left / scale, -top / scale, FRAME_W / scale, FRAME_H / scale, 0, 0, outWidth, outHeight);

        const terminar = (blob) => {
            setGuardando(false);
            if (!blob) return setError('No se pudo procesar la imagen.');
            onDone(blob);
        };

        canvas.toBlob((blob) => {
            // Si el navegador no sabe WebP, devuelve PNG (pesado): en ese caso se usa JPEG
            if (blob && blob.type === 'image/webp') return terminar(blob);
            canvas.toBlob(terminar, 'image/jpeg', 0.85);
        }, 'image/webp', calidad);
    };

    return (
        <div className='cropper-overlay' onClick={onCancel}>
            <div className='cropper-modal' onClick={(e) => e.stopPropagation()}>
                <h3 className='cropper-title'>{titulo}</h3>

                {error ? <p className='cropper-error'>{error}</p> : (
                    <>
                        <div
                            className={`cropper-frame ${circle ? 'circle' : ''}`}
                            style={{ width: FRAME_W, height: FRAME_H }}
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                            onPointerCancel={onPointerUp}
                            onWheel={onWheel}
                        >
                            {img && (
                                <img
                                    src={img.src}
                                    alt="Vista previa"
                                    draggable={false}
                                    style={{
                                        width: img.naturalWidth * scale,
                                        height: img.naturalHeight * scale,
                                        left: FRAME_W / 2 + off.x - (img.naturalWidth * scale) / 2,
                                        top: FRAME_H / 2 + off.y - (img.naturalHeight * scale) / 2,
                                    }}
                                />
                            )}
                        </div>

                        <p className='cropper-hint'>Arrastra para moverla</p>

                        <input
                            type='range' className='cropper-zoom'
                            min='1' max='4' step='0.01' value={zoom}
                            onChange={(e) => cambiarZoom(Number(e.target.value))}
                        />
                    </>
                )}

                <div className='cropper-actions'>
                    <button className='cropper-btn cancel' onClick={onCancel}>Cancelar</button>
                    {!error && (
                        <button className='cropper-btn ok' onClick={aceptar} disabled={!img || guardando}>
                            {guardando ? 'Procesando...' : 'Aceptar'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}