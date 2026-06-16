import '../style/components/UserTag.css'

import { useNavigate } from 'react-router-dom';

import DefaultFoto from '../images/Cat.jpg';
import DefaultBanner from '../images/RomanStatue.png';

export default function UserTag({users}){

    const navigate = useNavigate();

    return (
        <div className="users-grid">
            {users.map((user, index) => (
                <div 
                    key={index} 
                    className={`user-card ${user.estado === 'Inactivo' ? 'inactive' : ''}`}
                    onClick={()=>navigate(`/perfil/${user.id}`)}
                >
                    <div className="user-banner-card">
                        <img 
                            src={user.banner || DefaultBanner} 
                            alt="Banner" 
                            className="banner-img"
                        />
                    </div>
                    <div className="user-info-card">

                        <div className="user-avatar-card">
                            <img 
                                src={user.foto || DefaultFoto} 
                                alt={user.username}
                                className="avatar-img-card"
                            />
                        </div>
                        
                        <h3 className="username-card">{user.username}</h3>
                        <p className="user-email-card">{user.correo}</p>
                        {user.biografia && (
                            <p className="user-bio-card">{user.biografia}</p>
                        )}

                        {/* <div className={`user-status ${user.estado === 'Activo' ? 'status-active' : 'status-inactive'}`}>
                            {user.estado}
                        </div> */}
                    </div>
                </div>
            ))}
        </div>
    );
}