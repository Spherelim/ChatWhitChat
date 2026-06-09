import { useState, useEffect } from 'react'

import '../style/includes/Alerts.css' 


export default function Alert({message, type = 'error',duration = 3000, onClose})
{
    const [isVisible, setIsVisible] = useState(true)

    useEffect(
        () => {
            if(duration > 0){
                const timer = setTimeout(
                    () => {
                        handleClose()
                    },duration
                )
                return () => clearTimeout(timer)
            }
        }, [duration]
    )

    const handleClose = () => {
        setIsVisible(false)
        if(onClose){
            setTimeout(onClose,300)
        }
    }

    if(!isVisible) return null

    return(
        <>
            <div className={`alert-overlay ${isVisible ? 'fade-in' : 'fade-out'}`}>
                <div className={`alert-card alert-${type}`}>
                    <div className='alert-icon'>
                        {
                            type === 'success' && (
                                <svg viewBox='0 0 24 24' fill='none' stroke='currentColor'>
                                    <path d='M20 6L9 17L4 12' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'/>
                                </svg>
                            )
                        }
                        {
                            type === 'error' && (
                                <svg viewBox='0 0 24 24' fill='none' stroke='currentColor'>
                                    <circle cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='2' />
                                    <line x1='12' y1='8' x2='12' y2='12' stroke='currentColor' strokeWidth='2' />
                                    <circle cx='12' cy='12' r='1' fill='currentColor' />
                                </svg>
                            )
                        }
                        {
                            type === 'warning' && (
                                <svg viewBox='0 0 24 24' fill='none' stroke='currentColor'>
                                    <path d='M12 9V13M12 17H12.01' stroke='currentColor' strokeWidth='2' strokeLinejoin='round' />
                                    <path d='M12 2L1 21H23L12 2Z' stroke='currentColor' strokeWidth='2' strokeLinejoin='round' />
                                </svg>
                            )
                        }
                        {
                            type === 'info' && (
                                <svg viewBox='0 0 24 24' fill='none' stroke='currentColor'>
                                    <circle cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='2' />
                                    <line x1='12' y1='16' x2='12' y2='12' stroke='currentColor' strokeWidth='2'/>
                                    <circle cx='12' cy='12' r='1' fill='currentColor' />
                                </svg>
                            )
                        }
                    </div>
                        <div className='alert-content'>
                            <h3 className='alert-title'>
                                {type === 'success' && '¡Éxito!'}
                                {type === 'error' && 'Error'}
                                {type === 'warning' && 'Advertencia'}
                                {type === 'info' && 'Información'}
                            </h3>
                            <p className='alert-message'>{message}</p>
                        </div>
                        <button className='alert-close' onClick={handleClose}>
                            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor'>
                                <path d='M18 6L6 18M6 6L18 18' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
                            </svg>
                        </button>
                </div>
            </div>
        </>
    )
}