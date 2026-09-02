import '../style/components/DropdownMenu.css'

import { useState, useRef, useEffect} from 'react';

import DefaultImage from '../images/Cat.jpg'

export default function DropdownMenu({ user, onProfile, onFriend, onLogout}){
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

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

    const handleLogout = () => {
        setIsOpen(false);
        onLogout();
    }

    return (
        <div className="dropdown" ref={dropdownRef}>
            <img 
                className='img-user' 
                src={user?.foto || DefaultImage} 
                onClick={toggleDropdown}
                alt="User avatar"
            />
            
            {isOpen && (
                <div className="dropdown-menu">
                    <div className="dropdown-header">
                        <img 
                            className="dropdown-avatar" 
                            src={user?.foto || DefaultImage} 
                            alt="Avatar"
                        />
                        <div className="dropdown-user-info">
                            <span className="dropdown-username">{user?.username || "Usuario"}</span>
                            <span className="dropdown-email">{user?.email || "usuario@email.com"}</span>
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
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeWidth="2" strokeLinecap="round"/>
                            <circle cx="12" cy="7" r="4" strokeWidth="2"/>
                        </svg>
                        Buscar Amigo
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
