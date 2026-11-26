import '../style/components/DropdownMenu.css'

import { useState, useRef, useEffect} from 'react';

import { getUserProfile } from '../services/authService'

import DefaultImage from '../images/Cat.jpg'

export default function DropdownMenu({ user, onProfile, onFriend, onLogout}){
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Datos frescos del servidor (foto, nombre, correo). Mientras llegan se usa el user de la sesión.
    const [perfil, setPerfil] = useState(null);
    const mostrado = perfil ?? user;

    useEffect(() => {
        if(!user?.id) return;
        let activo = true;

        getUserProfile(user.id)
            .then(data => { if(activo && data.success) setPerfil(data.user); })
            .catch(err => console.error(err));

        // Perfil.jsx avisa con este evento al guardar, para que la foto cambie al instante
        const onCambio = (e) => {
            if(String(e.detail?.id) === String(user.id)) setPerfil(e.detail);
        };
        window.addEventListener('perfil:actualizado', onCambio);

        return () => {
            activo = false;
            window.removeEventListener('perfil:actualizado', onCambio);
        };
    }, [user?.id]);

    useEffect(() =>{
        const handleClickOutside = (event) => {
            if(dropdownRef.current && !dropdownRef.current.contains(event.target)){
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown',handleClickOutside);
        return () => document.removeEventListener('mousedown',handleClickOutside);

    },[]);

    const toggleDropdown = () => {
        setIsOpen(!isOpen);
    };

    const handleProfile = () => {
        setIsOpen(false);
        onProfile();
    }

    const handleFriend = () => {
        setIsOpen(false);
        onFriend();
    }

    // const handleExplore = () => {
    //     setIsOpen(false);
    //     onExplore();
    // }

    const handleLogout = () => {
        setIsOpen(false);
        onLogout();
    }

    return (
        <div className="dropdown" ref={dropdownRef}>
            <img 
                className='img-user' 
                src={mostrado?.foto || DefaultImage} 
                onClick={toggleDropdown}
                alt="User avatar"
            />
            
            {isOpen && (
                <div className="dropdown-menu">
                    <div className="dropdown-header">
                        <img 
                            className="dropdown-avatar" 
                            src={mostrado?.foto || DefaultImage} 
                            alt="Avatar"
                        />
                        <div className="dropdown-user-info">
                            <span className="dropdown-username">{mostrado?.username || "Usuario"}</span>
                            <span className="dropdown-email">{mostrado?.email || "usuario@email.com"}</span>
                        </div>
                    </div>
                    
                    <div className="dropdown-divider"></div>
                    
                    <button className="dropdown-item" onClick={handleProfile}>
                        <svg className="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeWidth="2" strokeLinecap="round"/>
                            <circle cx="12" cy="7" r="4" strokeWidth="2"/>
                        </svg>
                        Ver Perfil
                    </button>

                    <button className="dropdown-item" onClick={handleFriend}>
                        <svg className="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="11" cy="11" r="8" strokeWidth="2"/>
                            <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        Buscar Usuario
                    </button>

                    {/* <button className="dropdown-item" onClick={handleExplore}>
                        <svg className="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                            <line x1="2" y1="12" x2="22" y2="12" strokeWidth="2"/>
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" strokeWidth="2"/>
                        </svg>
                        Explorar y Itinerario
                    </button> */}
                    
                    <button className="dropdown-item" onClick={null}>
                        <svg className="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path
                                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        Ajustes
                    </button>

                    <div className="dropdown-divider"></div>

                    <button className="dropdown-item" onClick={handleLogout}>
                        <svg className="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeWidth="2" strokeLinecap="round"/>
                            <polyline points="16 17 21 12 16 7" strokeWidth="2" strokeLinecap="round"/>
                            <line x1="21" y1="12" x2="9" y2="12" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        Cerrar Sesión
                    </button>
                </div>
            )}
        </div>
    );

}