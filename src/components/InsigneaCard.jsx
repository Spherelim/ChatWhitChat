import '../style/components/InsigneaCard.css'

export default function InsigneaCard({
    nombre = 'Viajero',
    actual = 1,
    total = 4,
    dorada = false,
    imagen = null        // la imagen de la insignia: se ve en el círculo cuando ya se completó
}){

    // Porcentaje del arco (0 a 100)
    const porcentaje = total > 0
        ? Math.min(100, Math.max(0, (actual / total) * 100))
        : 0;

    // Desbloqueada: el círculo se llena y en vez de la fracción sale la imagen
    const obtenida = total > 0 && actual >= total;

    return(
        <div className={`InsigneaCard-container ${obtenida ? 'is-obtenida' : ''} ${dorada ? 'is-dorada' : ''}`}>
            <p className='InsigneaCard-Name'>{nombre}</p>

            {/* El círculo: un SVG con el fondo y un arco que crece según el progreso */}
            <div className='InsigneaCard-circulo'>
                <svg className='InsigneaCard-svg' viewBox='0 0 100 100'>
                    <circle className='InsigneaCard-fondo' cx='50' cy='50' r='46' />
                    {porcentaje > 0 && (
                        <circle
                            className='InsigneaCard-progreso'
                            cx='50' cy='50' r='46'
                            pathLength='100'
                            strokeDasharray={`${porcentaje} ${100 - porcentaje}`}
                            transform='rotate(-90 50 50)'
                        />
                    )}
                </svg>
                {obtenida && imagen
                    ? <img className='InsigneaCard-imagen' src={imagen} alt={nombre} />
                    : <p className='InsigneaCard-fraccion'>{actual}/{total}</p>}
            </div>
        </div>
    )
}