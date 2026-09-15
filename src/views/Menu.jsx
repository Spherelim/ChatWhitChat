import '../style/Menu.css'

import NavBar from '../includes/NavBar.jsx'
import { useAuth } from '../context/AuthContext.jsx'

import Post from '../components/Post.jsx'
import ToggleChat from '../includes/ToggleChat.jsx'

export default function Menu() {
    const { user } = useAuth();

    return (
        <>
            <NavBar />
            {                
                user && <ToggleChat/>
            }
            <div className='Buscador-Conteiner'>
                <div className='buscador-wrapper'>
                    <input type="search" className='Buscador' placeholder='Busca Post o Lugar...'/>
                </div>
            </div>
            
            <div className='menu'>
                
                {
                    // quiero poner un emoji pero van a pensar que es IA
                    user && <p className='Bienvenida'>hola {user.username}, Bienvenido :) </p>
                }

                {/* <img src="/public/CwC_2.png" alt="Logo" className='menu-logo' />

                    <h1 className='form-title'>Menú</h1>
                    {
                        user && <p className='Bienvenida'>Bienvenido, {user.username}!</p>
                    } */}

                <Post></Post>
                <Post></Post>
                <Post></Post>


            </div>        
        </>
    )
}