import NavBar from '../includes/NavBar'
import Button from '../components/Button'

import { useAuth } from '../context/AuthContext'

import PerfilFoton from '../images/Cat.jpg'
import BannerFoton from '../images/RomanStatue.png'

import YT_Logo from '../icons/Social/YT/youtube.png'
import FB_Logo from '../icons/Social/FB/facebook.png'
import IG_Logo from '../icons/Social/IG/instagram (2).png'

import '../style/Perfil.css'

export default  function Perfil(){

    const {user} = useAuth();

    return(
        <>
            <NavBar />
            <div className='perfil-container'>
                <div className='banner-container'>
                    <img className='banner-img' src={user?.banner || BannerFoton} alt='Banner' />
                </div>

                <div className='perfil-content'>
                    <div className='avatar-section'>
                        <img className='foto-perfil' src={user?.foto || PerfilFoton} alt='Avatar' />
                        <div className='user-info'>
                            <div className='username-container'>
                                <h1 className='username'>{user?.username || "UserName"}</h1>
                                
                                <div className='Social-Media'>
                                    <img src={YT_Logo} alt="MediaSocial"/>
                                    <img src={IG_Logo} alt="MediaSocial"/>
                                    <img src={FB_Logo} alt="MediaSocial"/>
                                </div>

                            </div>
                            <p className='bio'>{user?.bio || ""}</p>
                        </div>
                    </div>
                </div>
                {/* <p className='form-title'>Hola soy Perfil</p> */}
            </div>
        </>
    )
}

