import NavBar from '../includes/NavBar'
import Button from '../components/Button'

import { useAuth } from '../context/AuthContext'

import '../style/Perfil.css'

export default  function Perfil(){

    const {user} = useAuth();

    return(
        <>
            <NavBar />
            <div className='perfil-container'>
                <div className='banner-container'>
                    <img className='banner-img' src={user?.banner || "#"} alt='Banner' />
                </div>

                <div className='perfil-content'>
                    <div className='avatar-section'>
                        <img className='foto-perfil' src={user?.foto || "#"} alt='Avatar' />
                        <Button className='editar-foto-btn'>Editar</Button>
                    </div>
                </div>

                <div className='info-usuario'>
                    <h1 className='username'>{user?.username || "UserName"}</h1>
                    <p className='bio'>{user?.bio || ""}</p>
                </div>

                {/* <p className='form-title'>Hola soy Perfil</p> */}
            </div>
        </>
    )
}

