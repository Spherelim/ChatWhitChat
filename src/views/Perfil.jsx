import NavBar from '../includes/NavBar'
import ToggleChat from '../includes/ToggleChat'
import Post from '../components/Post'
import VenueTag from '../components/VenueTag'
import InsigneaCard from '../components/InsigneaCard'
import ImageCropper from '../includes/ImageCropper'

import { getPostsUsuario } from '../services/postService.js'
import { getContactos, actualizarPerfil, normalizarLink } from '../services/perfilService.js'

import { useAuth } from '../context/AuthContext'
import { useParams } from 'react-router-dom'

import { useEffect,useRef,useState } from 'react'
import { getUserProfile, getFollowing, setFollow, unFollow } from '../services/authService'
import { detectarRed } from '../utils/socialIcons'

import PerfilFoton from '../images/Cat.jpg'
import BannerFoton from '../images/RomanStatue.png'

import LapizIcon from '../icons/ui/Edit/lapiz.png'
import DeleteIcon from '../icons/ui/others/basura (1).png'
import linckIcon from '../icons/ui/others/enlace.png'

import '../style/Perfil.css'

// Nota (Mau): por una cosa borre lo que tenia XD (Contacs.jsx, UserTag.jsx & This).

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

    const auth = useAuth();
    const {user} = auth;
    // para que NavBar, chat, etc. vean la foto nueva sin volver a iniciar sesión
    // (usa el setUser o updateUser que tenga tu AuthContext, si no tiene ninguno no pasa nada)
    const actualizarSesion = auth.setUser ?? auth.updateUser;
    
    const { id } = useParams();

    // El perfil que se está viendo: el de la URL, o el mío si no hay id
    const perfilId = id ?? user?.id;

    const [profileUser,setProfileUser] = useState(null);

    const [siguiendo,setSiguiendo] = useState(false);

    const [section,setSection] = useState('Posts');

    const [editando,setEditando] = useState(false);

    // ----- Enlaces de redes (sección Edición) -----
    // links = los guardados en la BD (los que se ven en el perfil)
    // linksEdit = borrador mientras se edita (no se guarda hasta darle a "Guardar")
    const [links,setLinks] = useState([]);
    const [linksEdit,setLinksEdit] = useState([]);
    const [linkInput,setLinkInput] = useState('');
    const [editandoLinkId,setEditandoLinkId] = useState(null);

    // ----- Datos del formulario de Edición -----
    const [form,setForm] = useState({ username:'', email:'', bio:'' });
    const [fotoNueva,setFotoNueva] = useState(null);     // { blob, preview } ya recortada y comprimida
    const [bannerNuevo,setBannerNuevo] = useState(null);
    const [cropper,setCropper] = useState(null);         // { tipo:'foto'|'banner', file }
    const [guardando,setGuardando] = useState(false);
    const [errorEdicion,setErrorEdicion] = useState('');
    const fotoInput = useRef(null);
    const bannerInput = useRef(null);

    const [posts, setPosts] = useState([]);

    const handleFollow = async () => {
        if(!user?.id || !currentUser?.id) return; // sin sesión no se puede seguir

        const yaSigue = siguiendo;
        setSiguiendo(!yaSigue); // cambio el botón de inmediato...

        try{
            const data = yaSigue
                ? await unFollow(currentUser.id, user.id)
                : await setFollow(currentUser.id, user.id);

            if(!data.success){
                throw new Error(data.error);
            }
        }
        catch(err){
            console.error(err);
            setSiguiendo(yaSigue); // ...y si el servidor falló, lo regreso como estaba
        }
    }

    // Añadir un enlace nuevo, o actualizar el que se está editando
    const handleGuardarLink = () => {
        if(!linkInput.trim()) return;

        const url = normalizarLink(linkInput);
        if(!url){
            setErrorEdicion('Ese enlace no es válido');
            return;
        }
        if(!editandoLinkId && linksEdit.length >= 10){
            setErrorEdicion('Máximo 10 enlaces');
            return;
        }
        setErrorEdicion('');

        if(editandoLinkId){
            setLinksEdit(prev => prev.map(l => l.id === editandoLinkId ? { ...l, url } : l));
        }
        else{
            setLinksEdit(prev => [...prev, { id: Date.now(), url }]);
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
        setLinksEdit(prev => prev.filter(l => l.id !== linkId));

        if(editandoLinkId === linkId){
            setEditandoLinkId(null);
            setLinkInput('');
        }
    }

    // Elegir foto/banner: se abre el recortador, y lo que sale de ahí es lo que se sube
    const handleElegirImagen = (tipo, e) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // para poder elegir el mismo archivo otra vez
        if(!file) return;

        if(!file.type.startsWith('image/')){
            setErrorEdicion('Ese archivo no es una imagen');
            return;
        }
        setErrorEdicion('');
        setCropper({ tipo, file });
    }

    const handleImagenLista = (blob) => {
        const nueva = { blob, preview: URL.createObjectURL(blob) };

        if(cropper.tipo === 'foto'){
            if(fotoNueva) URL.revokeObjectURL(fotoNueva.preview);
            setFotoNueva(nueva);
        }
        else{
            if(bannerNuevo) URL.revokeObjectURL(bannerNuevo.preview);
            setBannerNuevo(nueva);
        }
        setCropper(null);
    }

    const handleGuardarPerfil = async () => {
        if(!user?.id || guardando) return;

        setGuardando(true);
        setErrorEdicion('');

        try{
            const data = await actualizarPerfil(user.id, {
                ...form,
                links: linksEdit.map(l => l.url),
                foto: fotoNueva?.blob,
                banner: bannerNuevo?.blob,
            });

            if(!data.success) throw new Error(data.error);

            setProfileUser(data.user);
            setLinks(data.contactos);
            actualizarSesion?.({ ...user, ...data.user });
            window.dispatchEvent(new CustomEvent('perfil:actualizado', { detail: data.user })); // el NavBar cambia su foto

            setEditando(false);
            setSection('Posts');
        }
        catch(err){
            console.error(err);
            setErrorEdicion(err.message || 'No se pudo guardar el perfil');
        }
        finally{
            setGuardando(false);
        }
    }

    // Siempre se pide al servidor (también mi perfil), así se ve lo último que guardé
    useEffect(() => {
        if(!perfilId) return;
        const loadProfile = async () =>{
            try{
                const [perfil, contactos] = await Promise.all([
                    getUserProfile(perfilId),
                    getContactos(perfilId),
                ]);

                if(perfil.success){
                    setProfileUser(perfil.user);
                }
                setLinks(contactos.success ? contactos.contactos : []);
            }
            catch(err){
                console.error(err);
            }
        };

        loadProfile();

    }, [perfilId]);

    // pa que chingados puse esta variable?
    // (mientras carga mi propio perfil se usa el de la sesión; el de otro usuario espera al servidor)
    const currentUser = (profileUser && String(profileUser.id) === String(perfilId))
        ? profileUser
        : (id ? null : user);

    // esta madre sabe si es el tú perfil o neh
    const isOwnProfile = user && currentUser && String(user.id) === String(currentUser.id);

    // ¿Ya sigo a este Usuario? (para que el botón salga como "Siguiendo" al entrar)
    useEffect(() => {
        if(!user?.id || !currentUser?.id || String(user.id) === String(currentUser.id)) return;

        const cargarSeguimiento = async () => {
            try{
                const data = await getFollowing(user.id);

                if(data.success){
                    setSiguiendo(data.users.some(u => String(u.id) === String(currentUser.id)));
                }
            }
            catch(err){
                console.error(err);
            }
        };

        cargarSeguimiento();
    }, [user?.id, currentUser?.id]);

    useEffect(() => {
        if(!currentUser?.id) return;

        const cargarPosts = async () => {
            try{
                const data = await getPostsUsuario(currentUser.id, user?.id);
                if(data.success) setPosts(data.posts ?? []);
            }catch (err) { console.error('Error al cargar posts:', err); }
        };

        cargarPosts();
    },[currentUser?.id, user?.id]);
    
    // Al abrir la Edición se llena el formulario con lo que hay guardado
    useEffect(() => {
        if(!editando || !currentUser) return;

        setForm({
            username: currentUser.username || '',
            email: currentUser.email || '',
            bio: currentUser.bio || '',
        });
        setLinksEdit(links);
        setFotoNueva(null);
        setBannerNuevo(null);
        setLinkInput('');
        setEditandoLinkId(null);
        setErrorEdicion('');
    }, [editando]);

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
                                    {links.map(link => {
                                        const icono = detectarRed(link.url);
                                        return (
                                            <img
                                                key={link.id}
                                                src={icono || linckIcon}
                                                alt="MediaSocial"
                                                title={link.url}
                                                className={icono ? '' : 'social-icon-default'}
                                                onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
                                            />
                                        );
                                    })}
                                </div>

                            </div>
                            <p className='user-email'>{currentUser?.email || "ERROR"}</p>
                            <p className='bio'>{currentUser?.bio || ""}</p>
                        </div>
                    </div>
                    
                    <div className='Header-sections'>
                        <p className={`Post-section ${section === 'Posts' ? 'Activa' : ''}`} onClick={()=> (setSection('Posts'),setEditando(false))}>Posts</p>
                        {/* <p className={`LV-section ${section === 'LV' ? 'Activa' : ''}`} onClick={()=>(setSection('LV'),setEditando(false))}>Lugares Visitados</p> */}
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
                                {posts.length === 0 
                                ? <p style={{color:'#c6d4df', textAlign:'center'}}>Aún no hay posts.</p>
                                : posts.map(p => <Post key={p.id} post={p} />)}
                            </div>
                        )
                    }

                    {/* Creo que mejor no pongo esta madre, que no sabria exactamente como agregarlo */}
                    {/* {
                        section === 'LV' &&(
                            <div className='LV-content'>
                                <VenueTag/>
                                <VenueTag/>
                                <VenueTag/>
                            </div>
                        )
                    } */}

                    {
                        section === 'LF' &&(
                            <div className='LV-content'>
                                {/* <VenueTag/> */}
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
                                    <img
                                        src={fotoNueva?.preview || currentUser?.foto || PerfilFoton}
                                        alt="img-Avatar" className='edit-img-Avatar'
                                        title='Cambiar foto' onClick={() => fotoInput.current?.click()}
                                    />
                                    <img
                                        src={bannerNuevo?.preview || currentUser?.banner || BannerFoton}
                                        alt="img-banner" className='edit-img-banner'
                                        title='Cambiar banner' onClick={() => bannerInput.current?.click()}
                                    />
                                    <input type='file' accept='image/*' hidden ref={fotoInput} onChange={(e) => handleElegirImagen('foto', e)}/>
                                    <input type='file' accept='image/*' hidden ref={bannerInput} onChange={(e) => handleElegirImagen('banner', e)}/>
                                </div>

                                <div className='edit-info-section'>
                                    <input type="text" className='edit-UserName' placeholder='UserName'
                                        value={form.username} maxLength={50}
                                        onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))}/>
                                    <input type="text" className='edit-Email' placeholder='Correo'
                                        value={form.email} maxLength={150}
                                        onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}/>
                                    <input type="text" className='edit-Bio' placeholder='Biografía'
                                        value={form.bio} maxLength={100}
                                        onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))}/>
                                </div>
                                <button className='btn-edit-save' onClick={handleGuardarPerfil} disabled={guardando}>
                                    {guardando ? 'Guardando...' : 'Guardar'}
                                </button>
                                {errorEdicion && <p className='edit-msg-error'>{errorEdicion}</p>}

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

                                    {linksEdit.length > 0 && (
                                        <div className='edit-lincks-list'>
                                            {linksEdit.map(link => {
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

            {cropper && (
                <ImageCropper
                    file={cropper.file}
                    aspect={cropper.tipo === 'foto' ? 1 : 4}
                    outWidth={cropper.tipo === 'foto' ? 400 : 1600}
                    circle={cropper.tipo === 'foto'}
                    calidad={cropper.tipo === 'foto' ? 0.85 : 0.8}
                    titulo={cropper.tipo === 'foto' ? 'Ajustar foto de perfil' : 'Ajustar banner'}
                    onDone={handleImagenLista}
                    onCancel={() => setCropper(null)}
                />
            )}
        </>
    )
}