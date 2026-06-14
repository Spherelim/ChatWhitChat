import '../style/Friends.css'

import NavBar from '../includes/NavBar'
import UserTag from '../components/UserTag'

import { useState, useEffect } from 'react'
import { getAllUsers } from '../services/authService';

export default function Friends(){

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,setError] = useState(null);

    useEffect(()=>{
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try{
            setLoading(true);
            const data = await getAllUsers();

            if(data.success){
                setUsers(data.users);
            }else{
                setError(data.error);
            }
        }catch(err){
            setError('Error al cargar los usuarios');
            console.error('Error:', err);
        }finally{
            setLoading(false);
        }
    };

    if(loading){
        return (
            <>
                <NavBar/>
                <div className='Friends-Container'>
                    <p>Cargando usuarios...</p>
                </div>
            </>
        );
    }

    if(error){
        return (
            <>
                <NavBar/>
                <div className='Friends-Container'>
                    <p className='error-message'>Error: {error}</p>
                </div>
            </>
        );
    }

    return(
        <>
            <NavBar/>
            <div className='Search-Container'>
                <div className='search-wrapper'>
                    {/* <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg> */}
                    <input type="search" className='Busqueda' placeholder='Busca por nombre o correo...'/>
                </div>
            </div>
            <div className='Friends-Container'>
                {/* <h1 className='form-mensaje'>Hola, Busca a tus amigos...</h1> */}
                <UserTag users={users} />
            </div>
        </>
    )
}