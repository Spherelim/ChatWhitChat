import '../style/Admin.css'

import { useState } from 'react'

import NavBar from '../includes/NavBar'
import ReportTag from '../components/ReportTag'

import DefaultFoto from '../images/Cat.jpg';
import DefaultBanner from '../images/RomanStatue.png';
import PostMalo from '../images/PostMalo.png';
import PostMalo_1 from '../images/PostMalo_1.png';
import PostMalo_2 from '../images/PostMalo_2.png';


export default function Admin(){

    const [seleccion,setSeleccion] = useState('Usuarios');

    // De momento se repite la misma imagen 4 veces solo para probar el carrusel;
    // cuando tengas datos reales, aquí simplemente pones el arreglo de imágenes de ese reporte.
    const imagenesReporte = [PostMalo, PostMalo_1, PostMalo, PostMalo_2];
    const [imgIndex, setImgIndex] = useState(0);
    const totalImagenes = imagenesReporte.length;

    const irAnterior = () => {
        setImgIndex(prev => (prev === 0 ? totalImagenes - 1 : prev - 1));
    };

    const irSiguiente = () => {
        setImgIndex(prev => (prev === totalImagenes - 1 ? 0 : prev + 1));
    };

    return(
        <>
        <div className='admin-layout'>
            <NavBar />

            <div className='Admin-Container'>

                <div className='Admin-Header'>
                    <h2
                        className={`Pestaña-Usuarios ${seleccion === 'Usuarios' ? 'activa' : ''}`}
                        onClick={() => setSeleccion('Usuarios')}
                    >Usuarios</h2>
                    <h2
                        className={`Pestaña-Post ${seleccion === 'Post' ? 'activa' : ''}`}
                        onClick={() => setSeleccion('Post')}
                    >Post</h2>
                    <h2
                        className={`Pestaña-Comentarios ${seleccion === 'Comentarios' ? 'activa' : ''}`}
                        onClick={() => setSeleccion('Comentarios')}
                    >Comentarios</h2>
                    <h2
                        className={`Pestaña-ERRORES ${seleccion === 'ERRORES' ? 'activa' : ''}`}
                        onClick={() => setSeleccion('ERRORES')}
                    >ERRORES</h2>
                </div>

                <div className='Reporte-Content'>
                    <div className='Reportes-Container'>
                        <ReportTag />
                        <ReportTag />
                        <ReportTag />
                        <ReportTag />
                        <ReportTag />
                        <ReportTag />
                        <ReportTag />
                        <ReportTag />
                        <ReportTag />
                        <ReportTag />
                    </div>

                    <div className='Reporte-Detalle'>
                        <div className='Detalle-info'>
                            <img src={DefaultFoto} alt="userAvatar" className='user-Avatar-img'/>
                            <h3 className='Username'>UserName</h3>
                            <p className='Motivo'>Motivo: Inapropiado</p>
                            <h5 className='title-description'>Descripción:</h5>
                            <p className='description'>este Post no coincide con un Lugar, imagenes no realsionadas.</p>
                        </div>
                        <div className='Detalle-Multimedia'>
                            <img
                                src={imagenesReporte[imgIndex]}
                                alt={`multimedia-${imgIndex + 1}`}
                            />

                            {totalImagenes > 1 && (
                                <>
                                    <button className='carousel-btn prev' onClick={irAnterior}>&#10094;</button>
                                    <button className='carousel-btn next' onClick={irSiguiente}>&#10095;</button>

                                    <span className='carousel-counter'>{imgIndex + 1}/{totalImagenes}</span>

                                    <div className='carousel-dots'>
                                        {imagenesReporte.map((_, i) => (
                                            <span
                                                key={i}
                                                className={`carousel-dot ${i === imgIndex ? 'active' : ''}`}
                                                onClick={() => setImgIndex(i)}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                        <button className='btn-bad'>Eliminar</button>
                    </div>

                    {
                        seleccion !== 'ERRORES' && (
                            <div className='Usuario-Reportado'>

                                <div className='user-reported'>
                                    <img src={DefaultBanner} alt="userBanner" className='user-banner-img'/>
                                    <img src={DefaultFoto} alt="userAvatar" className='user-Avatar-img'/>
                                    <h3 className='Username'>UserName</h3>
                                    <p className='email'>Correo@ejemplo.com</p>
                                    <p className='bio'>Biografia</p>
                                </div>

                                {/* <p className='advertencias-acumuladas'>Advertencias acumuladas: 2</p> */}

                                <div className='reported-info'>
                                    <div className='total-reportes'>
                                        <p className='title-total-reportes'>Total de Reportes:</p>
                                        <p className='cantidad-reportes'>20</p>
                                    </div>
                                    <p className='motivo-reporte'>Motivos de Reposte</p>
                                    <div className='motivos-reporte'>
                                        <p className='etiqueta-reporte'>Mal comportamiento</p>
                                    </div>
                                </div>

                                <div className='buttons-area'>
                                    <button className='btn-normal'>Ignorar reporte</button>
                                    <button className='btn-mid'>Suspender Cuenta</button>
                                    <button className='btn-bad'>Advertencia</button>
                                </div>

                            </div>
                        )
                    }
                    

                </div>

            </div>
        </div>
        </>
    )
}