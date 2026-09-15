import '../style/components/UserTag.css'

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx'

import DefaultFoto from '../images/Cat.jpg';
import DefaultBanner from '../images/RomanStatue.png';

import { useState } from 'react';

export default function UserTag({users}){

    const navigate = useNavigate();
    const { user: loggedUser } = useAuth();

    const [siguiendo, setSiguiendo] = useState({});

    const filteredUsers = loggedUser ? users.filter(user => user.id !== loggedUser.id)
    : users;

    const handleFollow = (e, userId) => {
        e.stopPropagation();
        // console.log("Falta Implementar la logica para el servidor, Seguir a: ", userId);
        
        setSiguiendo(prev => ({
            ...prev,
            [userId]: !prev[userId]
        }));

        console.log(`Usuario ${userId} ahora ${siguiendo[userId] ? 'deja de seguir' : 'sigue'}`);
    }

    return (
        <div className="users-grid">
            {filteredUsers.map((user, index) =>{
                const isFollowing = siguiendo[user.id] || false;
                return (
                    <div 
                        key={index} 
                        className={`user-card ${user.estado === 'Inactivo' ? 'inactive' : ''}`}
                        onClick={()=>navigate(`/perfil/${user.id}`)}
                    >
                        <div className="user-banner-card" 
                        // onClick={()=>navigate(`/perfil/${user.id}`)}
                        >
                            <img 
                                src={user.banner || DefaultBanner} 
                                alt="Banner" 
                                className="banner-img"
                            />
                        </div>
                        <div className="user-info-card">

                            <div className="user-avatar-card" 
                            // onClick={()=>navigate(`/perfil/${user.id}`)}
                            >
                                <img 
                                    src={user.foto || DefaultFoto} 
                                    alt={user.username}
                                    className="avatar-img-card"
                                />
                            </div>

                            <button className={isFollowing ? 'btn-follow following' : 'btn-follow'}
                                onClick={(e) => handleFollow(e,user.id)}>{isFollowing ? 'Siguiendo' : 'Seguir'}</button>

                            <h3 className="username-card">{user.username}</h3>
                            <p className="user-email-card">{user.email}</p>
                            {user.biografia && (
                                <p className="user-bio-card">{user.biografia}</p>
                            )}

                            {/* <div className={`user-status ${user.estado === 'Activo' ? 'status-active' : 'status-inactive'}`}>
                                {user.estado}
                            </div> */}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}