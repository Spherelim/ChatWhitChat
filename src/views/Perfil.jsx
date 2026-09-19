import NavBar from '../includes/NavBar'
import ToggleChat from '../includes/ToggleChat'
import Post from '../components/Post'
import VenueTag from '../components/VenueTag'
import InsigneaCard from '../components/InsigneaCard'

import { useAuth } from '../context/AuthContext'
import { useParams } from 'react-router-dom'

import { useEffect,useState } from 'react'
import { getUserProfile } from '../services/authService'
import { detectarRed } from '../utils/socialIcons'

import PerfilFoton from '../images/Cat.jpg'
import BannerFoton from '../images/RomanStatue.png'

import YT_Logo from '../icons/Social/YT/1_youtube.png'
import FB_Logo from '../icons/Social/FB/1_facebook.png'
import IG_Logo from '../icons/Social/IG/1_instagram.png'

import LapizIcon from '../icons/ui/Edit/lapiz.png'
import DeleteIcon from '../icons/ui/others/basura (1).png'
import linckIcon from '../icons/ui/others/enlace.png'

import '../style/Perfil.css'

// Nombre y total de itinerarios que pide cada insignia.
// (Esmeralda, Amatista y Perla: puse 64, 74 y 84 siguiendo el patrón, cámbialos por los reales)
const INSIGNEAS = [
    { nombre: 'Hierro',    total: 4  },
    { nombre: 'Bronce',    total: 12 },
    { nombre: 'Plata',     total: 24 },
    { nombre: 'Oro',       total: 34 },
    { nombre: 'Zafiro',    total: 44 },
    { nombre: 'Rubí',      total: 54 },
    { nombre: 'Esmeralda', total: 64 },
    { nombre: 'Amatista',  total: 74 },
    { nombre: 'Perla',     total: 84 },
    { nombre: 'Obsidiana',     total: 94 },
    { nombre: 'Diamante',     total: 104 },
];

export default  function Perfil(){

    const {user} = useAuth();
    
    const { id } = useParams();

    const [profileUser,setProfileUser] = useState(null);

    const [siguiendo,setSiguiendo] = useState(false);

    const [section,setSection] = useState('Posts');

    const [editando,setEditando] = useState(false);

    // ----- Enlaces de redes (sección Edición) -----
    const [links,setLinks] = useState([
        { id: 1, url: 'https://www.youtube.com/@Gsound1' },
    ]);
    const [linkInput,setLinkInput] = useState('');
    const [editandoLinkId,setEditandoLinkId] = useState(null);

    const handleFollow = () => {
        if(siguiendo){
            setSiguiendo(false);
        }
        else{
            setSiguiendo(true);
        }
    }

    // Añadir un enlace nuevo, o actualizar el que se está editando
    const handleGuardarLink = () => {
        const url = linkInput.trim();
        if(!url) return;

        if(editandoLinkId){
            setLinks(prev => prev.map(l => l.id === editandoLinkId ? { ...l, url } : l));
        }
        else{
            setLinks(prev => [...prev, { id: Date.now(), url }]);
        }

        setLinkInput('');
        setEditandoLinkId(null);
    }

    // El lápiz pasa el enlace al input para modificarlo
    const handleEditarLink = (link) => {
        setLinkInput(link.url);
        setEditandoLinkId(link.id);
    }

    const handleEliminarLink = (linkId) => {
        setLinks(prev => prev.filter(l => l.id !== linkId));

        if(editandoLinkId === linkId){
            setEditandoLinkId(null);
            setLinkInput('');
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

    // Icono de la red que se está escribiendo en el input (null si no la reconoce)
    const redInput = detectarRed(linkInput);

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

                        <div className={`foto-perfil-wrapper ${isOwnProfile ? 'editable' : ''}`}>
                            <img
                                className='foto-perfil'
                                src={currentUser?.foto || PerfilFoton}
                                alt='Avatar'
                                onClick={() => isOwnProfile && (setEditando(true), setSection('Editando'))}
                            />
                            {isOwnProfile && (
                                <div className='foto-perfil-overlay'>
                                    <img className='lapiz-icon' src={LapizIcon} alt='Editar foto'/>
                                </div>
                            )}
                        </div>
                        
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
                                    {/* <img src={IG_Logo} alt="MediaSocial" /> */}
                                    {/* <img src={FB_Logo} alt="MediaSocial"/> */}
                                </div>

                            </div>
                            <p className='user-email'>{currentUser?.email || "ERROR"}</p>
                            <p className='bio'>{currentUser?.bio || ""}</p>
                        </div>
                    </div>
                    
                    <div className='Header-sections'>
                        <p className={`Post-section ${section === 'Posts' ? 'Activa' : ''}`} onClick={()=> (setSection('Posts'),setEditando(false))}>Posts</p>
                        <p className={`LV-section ${section === 'LV' ? 'Activa' : ''}`} onClick={()=>(setSection('LV'),setEditando(false))}>Lugares Visitados</p>
                        <p className={`LF-section ${section === 'LF' ? 'Activa' : ''}`} onClick={()=>(setSection('LF'),setEditando(false))}>Lugares Favoritos</p>
                        {isOwnProfile && (
                                <p className={`Insigneas-section ${section === 'Insigneas' ? 'Activa' : ''}`} onClick={()=>(setSection('Insigneas'),setEditando(false))}>Insigneas</p>
                            )}
                        {
                            editando && isOwnProfile && (
                                <p className={`Editando-section ${section === 'Editando' ? 'Activa' : ''}`}>Edición</p>
                            )
                        }
                    </div>
                    
                    {
                        section === 'Posts' && (
                            <div className='post-content'>
                                <Post></Post>
                                <Post></Post>
                                <Post></Post>
                            </div>
                        )
                    }
                    {
                        section === 'LV' &&(
                            <div className='LV-content'>
                                <VenueTag/>
                                <VenueTag/>
                                <VenueTag/>
                            </div>
                        )
                    }
                    {
                        section === 'LF' &&(
                            <div className='LV-content'>
                                <VenueTag/>
                            </div>
                        )
                    }
                    {
                        section === 'Insigneas' &&(
                            <div className='Insigneas-content'>
                                <p className='Insigneas-title'>Completa tus Itinerarios y Consigue un Emblema</p>

                                <div className='Insigneas-grid'>
                                    {INSIGNEAS.map(insignea => (
                                        <InsigneaCard
                                            key={insignea.nombre}
                                            nombre={insignea.nombre}
                                            actual={1} // pendiente: sacar los itinerarios completados del backend
                                            total={insignea.total}
                                        />
                                    ))}
                                </div>
                            </div>
                        )
                    }
                    {
                        section === 'Editando' &&(
                            <div className='Edicion-content'>
                                <div className='edit-img-section'>
                                    {/* Examinar archivos */}
                                    <img src={PerfilFoton} alt="img-Avatar" className='edit-img-Avatar'/>
                                    <img src={BannerFoton} alt="img-banner" className='edit-img-banner'/>
                                </div>

                                <div className='edit-info-section'>
                                    <input type="text" className='edit-UserName' placeholder='UserName'/>
                                    <input type="text" className='edit-Email' placeholder='Correo'/>
                                    <input type="text" className='edit-Bio' placeholder='Biografía'/>
                                </div>
                                <button className='btn-edit-save'>Guardar</button>

                                {/* me dio flojera separarlo como componente */}
                                <div className='edit-lincks-section'>
                                    <div className='edit-linck-form'>
                                        <div className='edit-linck-input'>
                                            {/* Si reconoce la red pone su icono, si no el de enlace */}
                                            <img src={redInput || linckIcon} alt="linckIcon" className='icon-linck' />
                                            <input
                                                type="text"
                                                className='link-text'
                                                placeholder='Vincular URL'
                                                value={linkInput}
                                                onChange={(e) => setLinkInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleGuardarLink()}
                                            />
                                        </div>
                                        <button className='btn-add-linck' onClick={handleGuardarLink}>
                                            {editandoLinkId ? 'Actualizar' : 'Añadir'}
                                        </button>
                                    </div>

                                    {links.length > 0 && (
                                        <div className='edit-lincks-list'>
                                            {links.map(link => {
                                                const iconoRed = detectarRed(link.url);

                                                return (
                                                    <div className='linck-Card' key={link.id}>

                                                        <img
                                                            src={iconoRed || linckIcon}
                                                            alt="social"
                                                            className={`social-icon ${iconoRed ? '' : 'social-icon-default'}`}
                                                        />
                                                        <p className='social-linck'>{link.url}</p>
                                                        
                                                        <button className='edit-social-linck' onClick={() => handleEditarLink(link)}>
                                                            <img src={LapizIcon} alt="Editar" className='btn-edit-linck'/>
                                                        </button>
                                                        <button className='delete-social-linck' onClick={() => handleEliminarLink(link.id)}>
                                                            <img src={DeleteIcon} alt="Eliminar" className='btn-delete-linck'/>
                                                        </button>

                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    }
                </div>


                {/* <p className='form-title'>Hola soy Perfil</p> */}
            </div>
        </>
    )
}