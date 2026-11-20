import { useEffect, useState } from 'react'
import '../style/Menu.css'

import NavBar from '../includes/NavBar.jsx'
import { useAuth } from '../context/AuthContext.jsx'

import { getPosts } from '../services/postService.js'

import Post from '../components/Post.jsx'
import ToggleChat from '../includes/ToggleChat.jsx'
import ShowToPost from '../includes/ShowToPost.jsx'

import AddPostIcon from '../icons/ui/others/burbuja-de-pensamiento (2).png'

export default function Menu() {
    const { user } = useAuth();

    const [mostrarToPost, setMostrarToPost] = useState(false);
    const [posts, setPosts] = useState([]);

    const cargarPosts = async () => {
        try{
            const data = await getPosts(user?.id);
            if (data.success) setPosts(data.posts);
        }catch (err) { console.error('Error al cargar posts:', err); }
    };

    useEffect(() => { cargarPosts(); }, [user?.id]);

    const handleNuevoPost = () => {
        setMostrarToPost(false);
        cargarPosts();
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

                {posts.map(p => <Post key={p.id} post={p} />)}

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