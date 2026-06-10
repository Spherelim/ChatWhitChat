import { useNavigate } from 'react-router-dom';
import '../style/includes/NavBar.css'

import Button from '../components/Button.jsx'
import { useAuth } from '../context/AuthContext.jsx'

import DropdownMenu from '../components/DropdownMenu.jsx';

// import DefaultImage from '../images/Cat.jpg'

export default function NavBar() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    console.log("Usuario en NavBar:", user);

    // Regresa al Login.
    const handleLogin = () => {
        window.location.href = "/login";
    }

    // Regresa al Register.
    const handleRegister = () => {
        window.location.href = "/register";
    }

    // Cierra sesión.
    const handleLogout = () => {
        logout();
        window.location.href = "/login"
    }

    // Muestra el perfil del usuario.
    const handleProfile = () => {
        navigate('/perfil');
    }

    const handleHome = () => {
        navigate('/');
    }

    // Cambiar acpecto si esta logueado o no
    // const isLoggedIn = false; 
    const VisualLog = user ? (
        <>
            {/* Aqui despues lo cambio para que meustre la foto del usuario. */}
            {/* <Button className='btn btn-profile' onClick={handleProfile} onClick={()=> window.location.href = "/Perfil"}>
                {user.username}
            </Button> */}

            {/* <img className='img-user' src={user?.foto || DefaultImage} onClick={()=> window.location.href = "/Perfil"} /> */}
            {/* Este logOut proximamente lo voy a quitar y lo voy a cambiar por un dropdown menu con opciones como "Perfil", "Configuración", "Cerrar sesión", etc. */}
            {/* <Button className='btn btn-logout' onClick={handleLogout}>
                Logout
            </Button> */}

            <DropdownMenu 
                user={user}
                onProfile={handleProfile}
                onLogout={handleLogout}
            />

        </>
    ) : (
        <>
            {/* En dado caso que entre sin estar logueado, le muestra las opciones de Login y Register. */}
            <Button className='btn btn-login' onClick={handleLogin}>
                Login
            </Button>
            <Button className='btn btn-register' onClick={handleRegister}>
                Register
            </Button>
        </>
    );

    return (

        // NavBar (parte Superior)
        <nav className='navbar'>
            {/* identidad de la pagina */}
            <div className='navbar-WebName' onClick={handleHome}>
                {/* imagen representativa */}
                <img src="/public/CwC_Hover_1.png" alt="Logo" className='navbar-logo-img' />
                {/* Nombre de la pagina */}
                <h1 className='navbar-logo'>
                    ChatWithChat
                </h1>                
            </div>
            {/* visualizacion de botones dependiendo si esta logueado o no */}
            <ul className='navbar-menu'>
                {VisualLog}
            </ul>
        </nav>
    )
}