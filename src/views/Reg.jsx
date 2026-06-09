import '../style/Reg.css'

import Button from '../components/Button.jsx'

import Alert from '../includes/Alerts.jsx'
import { useAlert } from '../hook/useAlert.jsx'

import { register } from '../services/authService.js'

export default function Reg() {

    const {showAlert,AlertComponent} = useAlert()

    const handleRegister = async () => {
        
        const username = document.querySelector("input[placeholder='Username']").value;
        const email = document.querySelector("input[placeholder='Email']").value;
        const password = document.querySelector("input[placeholder='Password']").value;
        const confirmPassword = document.querySelector("input[placeholder='Confirm Password']").value;
        
        if (password !== confirmPassword) {
            showAlert('Las contraseñas no coinciden','warning',3000);
            // alert("Las contraseñas no coinciden");
            return;
        }

        if(username.trim() === "" || email.trim() === "" || password.trim() === ""){
            // alert("Por favor completa todos los campos");
            showAlert('Por Favor, completa todos los campos','warning',3000);
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.log("Email: " + email);
            // alert("Porfavor ingresa un correo electrónico válido");
            showAlert('Por Favor ingresa un correo electrónico válido','warning',3000);
            return;
        }

        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&_-]{8,}$/;
        if (!passwordRegex.test(password)) {
            console.log("Password: " + password);
            // alert("La contraseña debe tener al menos 8 caracteres y contener al menos una letra y un número");
            showAlert('La contraseña debe tener al menos 8 caracteres y contener al menos una letra y un número','warning',3000);
            return;
        }

        const confirmPasswordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&_-]{8,}$/;
        if (!confirmPasswordRegex.test(confirmPassword)) {
            console.log("Confirm Password: " + confirmPassword);
            // alert("La contraseña de confirmación debe tener al menos 8 caracteres y contener al menos una letra y un número");
            showAlert('La contraseña debe tener al menos 8 caracteres y contener al menos una letra y un número','warning',3000);
            return;
        }

        const usernameRegex = /^[a-zA-Z0-9_]{3,}$/;
        if (!usernameRegex.test(username)) {
            console.log("Username: " + username);
            // alert("El nombre de usuario debe tener al menos 3 caracteres y solo puede contener letras, números y guiones bajos");
            showAlert('El nombre de usuario debe tener al menos 3 caracteres y solo puede contener letras, números y guiones bajos','warning',3000);
            return;
        }

        const emailDomain = email.split('@')[1];
        const allowedDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com'];
        
        if (!allowedDomains.includes(emailDomain)) {
            console.log("Email Domain: " + emailDomain);
            // alert("Por favor usa un dominio de correo electrónico válido (gmail.com, yahoo.com, outlook.com, hotmail.com, aol.com)");
            showAlert('Por favor usa un dominio de correo electrónico válido (gmail.com, yahoo.com, outlook.com, hotmail.com, aol.com)','warning',3000);
            return;
        }

        const usuario = { username, email, password };
        console.log("API URL:", import.meta.env.VITE_API_URL);

        try{
            const data = await register(usuario);
            console.log(data);
            if(data.success){
                // alert("Usuario registrado exitosamente");
                showAlert('Usuario registrado exitosamente','success',3000);
                setTimeout(() =>{
                    window.location.href = "/login";
                }, 3000);
            }
            else{
                // alert("Error al registrar usuario: " + data.error);
                const errorMessage = data.error || "Error al registrar usuario";
                showAlert(errorMessage,'error',4000);
            }
        }
        catch(error){
            console.error("Error al registrar usuario:", error);
            // alert("Error al registrar usuario");
            const errorMessage = error.message || "Error al registrar usuario...";
            showAlert(errorMessage,'error',4000);
        }

    }

    return (
        <>
            {AlertComponent}
            <div className='reg'>
                <h1 className='form-title'>Register</h1>
                <div className='form-container'>
                    <input type="text" placeholder='Username' className='form-control'/>
                    <input type="email" placeholder='Email' className='form-control'/>
                    <input type="password" placeholder='Password' className='form-control'/>
                    <input type="password" placeholder='Confirm Password' className='form-control'/>
                    
                    {/* Registrarse si no tiene cuenta */}
                    <p className='form-link'>¿Ya tienes una cuenta? <a href="/login" className='form-link'>Inicia sesión</a></p>

                    <Button className='btn btn-primary' onClick={handleRegister}>
                        Register
                    </Button>
                </div>
            </div>
        </>
    )
}