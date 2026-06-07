import '../style/Log.css'

import Button from '../components/Button.jsx'

import { login } from '../services/authService.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function Log() {
    const { login: authLogin } = useAuth();

    const handleLogin = async () => {

        const username = document.querySelector("input[placeholder='Username']").value;
        const password = document.querySelector("input[placeholder='Password']").value;

        console.log("Enviando:", { username, password });

        const data = await login(username, password);
        console.log("Respuesta completa:", data);

        if(data.success){

            console.log("Usuario autenticado:", data.user);
            console.log("Username del backend:", data.user?.username);

            authLogin({
                username: data.user.username,
                email: data.user.email,
                id: data.user.id,
                rol: data.user.rol,
                foto: data.user.foto,
                banner: data.user.banner,
                bio: data.user.bio
            });

            alert("Login successful");
            window.location.href = "/";
        }
        else{
            alert("Invalid credentials" + (data.error ? ": " + data.error : ""));
        }
    }

    return (
        <>
            <div className='log'>
                <h1 className='form-title'>Login</h1>
                <div className='form-container'>
                    <input type="text" placeholder='Username' className='form-control'/>
                    <input type="password" placeholder='Password' className='form-control'/>
                    
                    {/* Registrarse si no tiene cuenta */}
                    <p className='form-link'>¿No tienes una cuenta? <a href="/register" className='form-link'>Registrate</a></p>

                    <Button className='btn btn-primary' onClick={handleLogin}>
                        Login
                    </Button>
                </div>
            </div>
        </>
    )
}