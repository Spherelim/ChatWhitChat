import '../style/Menu.css'

import NavBar from '../includes/NavBar.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function Menu() {
    const { user } = useAuth();

    return (
        <div className='menu'>
            <NavBar />
            <h1 className='form-title'>Menú </h1>
            {
                user && <p className='Bienvenida'>Bienvenido, {user.username}!</p>
            }
        </div>
    )
}