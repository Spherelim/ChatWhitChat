import '../style/includes/ShowGaleria.css'

import { useEffect, useState } from 'react';

export default function ShowGaleria({
    imagenes = [],
    indiceInicial = 0,
    onClose = () => {}
}){

    const [indice, setIndice] = useState(indiceInicial);
    const total = imagenes.length;

    const anterior = () => setIndice(prev => (prev - 1 + total) % total);
    const siguiente = () => setIndice(prev => (prev + 1) % total);

    // Teclado: ← → para cambiar de imagen y Esc para cerrar
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') anterior();
            if (e.key === 'ArrowRight') siguiente();
        };

        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [total, onClose]);

    if (total === 0) return null;

    return(
        <div className='ShowGaleria-Container' onClick={onClose}>

            <button className='ShowGaleria-Close' onClick={onClose} aria-label='Cerrar'>×</button>

            <button
                className='ShowGaleria-Nav anterior'
                onClick={(e) => { e.stopPropagation(); anterior(); }}
                aria-label='Imagen anterior'
            >
                ‹
            </button>

            <div className='ShowGaleria-Visor' onClick={(e) => e.stopPropagation()}>
                <img
                    className='ShowGaleria-Img'
                    src={imagenes[indice]}
                    alt={`Imagen ${indice + 1} de ${total}`}
                />
                <p className='ShowGaleria-Contador'>{indice + 1} / {total}</p>
            </div>

            <button
                className='ShowGaleria-Nav siguiente'
                onClick={(e) => { e.stopPropagation(); siguiente(); }}
                aria-label='Imagen siguiente'
            >
                ›
            </button>

        </div>
    )
}