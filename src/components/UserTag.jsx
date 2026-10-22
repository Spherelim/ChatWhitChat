import '../style/components/UserTag.css'

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx'

import DefaultFoto from '../images/Cat.jpg';
import DefaultBanner from '../images/RomanStatue.png';

import { useEffect, useState } from 'react';
import { setFollow, unFollow, getFollowing } from '../services/authService';

export default function UserTag({users}){

    const navigate = useNavigate();
    const { user: loggedUser } = useAuth();

    const [siguiendo, setSiguiendo] = useState({});

    const filteredUsers = loggedUser ? users.filter(user => user.id !== loggedUser.id)
    : users;

    // Al cargar: ¿a quién sigo ya? (para que los botones salgan como "Siguiendo")
    useEffect(() => {
        if(!loggedUser?.id) return;

        const cargarSeguidos = async () => {
            try{
                const data = await getFollowing(loggedUser.id);

                if(data.success){
                    const mapa = {};
                    data.users.forEach(u => { mapa[u.id] = true; });
                    setSiguiendo(mapa);
                }
            }
            catch(err){
                console.error('Error al cargar seguidos:', err);
            }
        };

        cargarSeguidos();
    }, [loggedUser?.id]);

    const handleFollow = async (e, userId) => {
        e.stopPropagation();

        if(!loggedUser?.id) return; // sin sesión no se puede seguir

        const yaSigue = siguiendo[userId] || false;

        // Cambio el botón de inmediato (se siente rápido)...
        setSiguiendo(prev => ({ ...prev, [userId]: !yaSigue }));

        try{
            const data = yaSigue
                ? await unFollow(userId, loggedUser.id)
                : await setFollow(userId, loggedUser.id);

            if(!data.success){
                throw new Error(data.error);
            }
        }
        catch(err){
            console.error('Error al seguir/dejar de seguir:', err);
            // ...y si el servidor falló, lo regreso como estaba
            setSiguiendo(prev => ({ ...prev, [userId]: yaSigue }));
        }
    }

    return (
        <div className="users-grid">
            {filteredUsers.map((user, index) =>{
                const isFollowing = siguiendo[user.id] || false;
                return (
                    <div 
                        key={index} 
                        className={`user-card ${user.estado === 'Inactivo' ? 'inactive' : ''}`}
                        onClick={()=>navigate(`/perfil/${user.id}`)} //Dirije al perfil del Usuario
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
                                onClick={(e) => handleFollow(e,user.id)}>{isFollowing ? 'Siguiendo' : 'Seguir'}
                            </button>

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