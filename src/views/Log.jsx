import '../style/Log.css'

import Button from '../components/Button.jsx'

import Alert from '../includes/Alerts.jsx'
import { useAlert } from '../hook/useAlert.jsx'

import { login } from '../services/authService.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function Log() {
    const { login: authLogin } = useAuth();
    const { showAlert, AlertComponent } = useAlert()

    const handleLogin = async () => {

        const username = document.querySelector("input[placeholder='Username']").value;
        const password = document.querySelector("input[placeholder='Password']").value;

        if(!username || !password){
            showAlert('Por favor, completa todos los campos', 'warning', 3000);
            return;
        }
        
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

            showAlert('¡Login Exitoso!...','success',2000);
            setTimeout(() => {
                window.location.href = "/";
            }, 2000);
        }
        else{
            // alert("Invalid credentials" + (data.error ? ": " + data.error : ""));
            const errorMessage = data.error || "Credenciales inválidas";
            showAlert(errorMessage,'error',4000);
        }
    }

    return (
        <>
            {AlertComponent}

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