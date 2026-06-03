import '../style/includes/NavBar.css'

import Button from '../components/Button.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function NavBar() {

    const { user, logout } = useAuth();

    console.log("Usuario en NavBar:", user);

    const handleLogin = () => {
        window.location.href = "/login";
    }

    const handleRegister = () => {
        window.location.href = "/register";
    }

    const handleLogout = () => {
        logout();
    }

    const handleProfile = () => {
        alert("Profile de usuario: " + user?.username);
    }
    // Cambiar acpecto si esta logueado o no
    // const isLoggedIn = false; 

    const VisualLog = user ? (
        <>
            <Button className='btn btn-profile' onClick={handleProfile}>
                {user.username}
            </Button>
            <Button className='btn btn-logout' onClick={handleLogout}>
                Logout
            </Button>
        </>
    ) : (
        <>
            <Button className='btn btn-login' onClick={handleLogin}>
                Login
            </Button>
            <Button className='btn btn-register' onClick={handleRegister}>
                Register
            </Button>
        </>
    );

    return (
        <nav className='navbar'>
            <h1 className='navbar-logo' onClick={() => window.location.href = "/"}>
                ChatWhitChat
            </h1>
            <ul className='navbar-menu'>
                {VisualLog}
            </ul>
        </nav>
    )
}