import { useState } from 'react'
import '../style/Menu.css'

import NavBar from '../includes/NavBar.jsx'
import { useAuth } from '../context/AuthContext.jsx'

import Post from '../components/Post.jsx'
import ToggleChat from '../includes/ToggleChat.jsx'
import ShowToPost from '../includes/ShowToPost.jsx'

import AddPostIcon from '../icons/ui/others/burbuja-de-pensamiento (2).png'

export default function Menu() {
    const { user } = useAuth();

    const [mostrarToPost, setMostrarToPost] = useState(false);
    const [misPosts, setMisPosts] = useState([]);

    const handleNuevoPost = (post) => {
        setMisPosts(prev => [{ ...post, id: Date.now() }, ...prev]);
        setMostrarToPost(false);
    };

    return (
        <>
            <NavBar />
            {                
                user && <ToggleChat/>
            }
            <div className='Buscador-Conteiner'>
                <div className='buscador-wrapper'>
                    <input type="search" className='Buscador' placeholder='Busca Post o Lugar...'/>
                    <button className='btn-Add-Post' onClick={() => setMostrarToPost(true)}>
                        <img src={AddPostIcon} alt="Postear" className='Add-Post-icon'/>
                    </button>
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

                {misPosts.map((post) => (
                    <Post
                        key={post.id}
                        descripcion={post.descripcion}
                        imagenes={post.imagenes}
                        venue={post.venue}
                    />
                ))}

                <Post></Post>
                <Post></Post>
                <Post></Post>


            </div>

            {mostrarToPost && (
                <ShowToPost
                    onClose={() => setMostrarToPost(false)}
                    onPost={handleNuevoPost}
                />
            )}
        </>
    )
}