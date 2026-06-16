import '../style/Friends.css'

import NavBar from '../includes/NavBar'
import UserTag from '../components/UserTag'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getAllUsers, searchUsers } from '../services/authService';

export default function Friends(){

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,setError] = useState(null);

    const [searchTerm,setSearchTerm] = useState('');
    const [isSearching,setIsSearching] = useState(false);

    const debounceTimeout = useRef(null);

    const fetchUsers = useCallback(async (term = '') => {
        try{
            setLoading(true);
            setError(null);

            let data;
            if(term.trim() === ''){
                data = await getAllUsers();
            }
            else{
                data = await searchUsers(term);
            }

            if(data.success){
                setUsers(data.users);
            }
            else {
                setError(data.error);
            }
        }
        catch (err){
            setError('Error al cargar los usuarios');
            console.error('Error:', err);
        }
        finally {
            setLoading(false);
            setIsSearching(false);
        }
    }, []);

    useEffect(()=>{
        loadUsers();
    }, [fetchUsers]);

    useEffect(()=>{
        if (debounceTimeout.current){
            clearTimeout(debounceTimeout.current);
        }

        setIsSearching(true);

        debounceTimeout.current = setTimeout(() => {
            fetchUsers(searchTerm);
        },400);

        return () => {
            if(debounceTimeout.current){
                clearTimeout(debounceTimeout.current);
            }
        };

    },[searchTerm,fetchUsers]);

    const handleSearchChange = (e) =>{
        setSearchTerm(e.target.value);
    };

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

    if(loading && !isSearching){
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
                    <input type="search" className='Busqueda' placeholder='Busca por nombre o correo...' value={searchTerm} onChange={handleSearchChange}/>
                </div>
            </div>
            <div className='Friends-Container'>
                {/* <h1 className='form-mensaje'>Hola, Busca a tus amigos...</h1> */}
                {/* <UserTag users={users} /> */}
                {
                    isSearching ? (
                        <p className='search-loading'>Buscando...</p>
                    ) : users.length === 0 ? (
                        <p className='no-results'>No se encontraron usuarios</p>
                    ) : (
                        <UserTag users={users}/>
                    )
                }
            </div>
        </>
    )
}