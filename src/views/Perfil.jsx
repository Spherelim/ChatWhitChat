import NavBar from '../includes/NavBar'
import ToggleChat from '../includes/ToggleChat'
import Post from '../components/Post'

import { useAuth } from '../context/AuthContext'
import { useParams } from 'react-router-dom'

import { useEffect,useState } from 'react'
import { getUserProfile } from '../services/authService'

import PerfilFoton from '../images/Cat.jpg'
import BannerFoton from '../images/RomanStatue.png'

import YT_Logo from '../icons/Social/YT/youtube.png'
import FB_Logo from '../icons/Social/FB/facebook.png'
import IG_Logo from '../icons/Social/IG/instagram (2).png'

import '../style/Perfil.css'

export default  function Perfil(){

    const {user} = useAuth();
    
    const { id } = useParams();

    const [profileUser,setProfileUser] = useState(null);

    const [siguiendo,setSiguiendo] = useState(false);

    const handleFollow = () => {
        if(siguiendo){
            setSiguiendo(false);
        }
        else{
            setSiguiendo(true);
        }
    }

    useEffect(() => {
        if(!id) return;

        const loadProfile = async () =>{
            try{
                const data = await getUserProfile(id);

                if(data.success){
                    setProfileUser(data.user);
                }
            }
            catch(err){
                console.error(err);
            }
        };

        loadProfile();

    }, [id]);

    // pa que chingados puse esta variable?
    const currentUser = id ? profileUser : user;

    // esta madre sabe si es el tú perfil o neh
    const isOwnProfile = user && currentUser && user.id === currentUser.id;
    return(
        <>
            <NavBar />
            <ToggleChat/>
            <div className='perfil-container'>
                <div className='banner-container'>
                    <img className='banner-img' src={currentUser?.banner || BannerFoton} alt='Banner' />
                </div>

                <div className='perfil-content'>
                    <div className='avatar-section'>
                        <img className='foto-perfil' src={currentUser?.foto || PerfilFoton} alt='Avatar' />
                        <div className='user-info'>

                            {!isOwnProfile && (
                                <button className={siguiendo ? 'btn-follow following' : 'btn-follow'}
                                onClick={handleFollow}>
                                    {siguiendo ? 'Siguiendo' : 'Seguir'}
                                </button>
                            )}

                            <div className='username-container'>
                                <h1 className='username'>{currentUser?.username || "UserName"}</h1>
                                
                                <div className='Social-Media'>
                                    <img src={YT_Logo} alt="MediaSocial" onClick={() => window.open("https://www.youtube.com/@Gsound1","_blank")}/>
                                    <img src={IG_Logo} alt="MediaSocial" />
                                    <img src={FB_Logo} alt="MediaSocial"/>
                                </div>

                            </div>
                            <p className='user-email'>{currentUser?.email || "ERROR"}</p>
                            <p className='bio'>{currentUser?.bio || ""}</p>
                        </div>
                    </div>

                    {/* Estaria mejor poner algo como Post/Lugares Visitados/Lugares Favoritos/Likes */}

                    <div className='post-content'>
                        <Post></Post>
                        <Post></Post>
                        <Post></Post>
                    </div>
                </div>


                {/* <p className='form-title'>Hola soy Perfil</p> */}
            </div>
        </>
    )
}

