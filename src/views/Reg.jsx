import '../style/Reg.css'

import Button from '../components/Button.jsx'

import { register } from '../services/authService.js'

export default function Reg() {

    const handleRegister = async () => {

        
        const username = document.querySelector("input[placeholder='Username']").value;
        const email = document.querySelector("input[placeholder='Email']").value;
        const password = document.querySelector("input[placeholder='Password']").value;
        const confirmPassword = document.querySelector("input[placeholder='Confirm Password']").value;
        
        if (password !== confirmPassword) {
            alert("Las contraseñas no coinciden");
            return;
        }

        if(username.trim() === "" || email.trim() === "" || password.trim() === ""){
            alert("Por favor completa todos los campos");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.log("Email: " + email);
            alert("Porfavor ingresa un correo electrónico válido");
            return;
        }

        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&_-]{8,}$/;
        if (!passwordRegex.test(password)) {
            console.log("Password: " + password);
            alert("La contraseña debe tener al menos 8 caracteres y contener al menos una letra y un número");
            return;
        }

        const confirmPasswordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&_-]{8,}$/;
        if (!confirmPasswordRegex.test(confirmPassword)) {
            console.log("Confirm Password: " + confirmPassword);
            alert("La contraseña de confirmación debe tener al menos 8 caracteres y contener al menos una letra y un número");
            return;
        }

        const usernameRegex = /^[a-zA-Z0-9_]{3,}$/;
        if (!usernameRegex.test(username)) {
            console.log("Username: " + username);
            alert("El nombre de usuario debe tener al menos 3 caracteres y solo puede contener letras, números y guiones bajos");
            return;
        }

        const emailDomain = email.split('@')[1];
        const allowedDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com'];
        
        if (!allowedDomains.includes(emailDomain)) {
            console.log("Email Domain: " + emailDomain);
            alert("Por favor usa un dominio de correo electrónico válido (gmail.com, yahoo.com, outlook.com, hotmail.com, aol.com)");
            return;
        }

        const usuario = { username, email, password };
        console.log("API URL:", import.meta.env.VITE_API_URL);

        try{
            const data = await register(usuario);
            console.log(data);
            if(data.success){
                alert("Usuario registrado exitosamente");
                window.location.href = "/login";
            }
            else{
                alert("Error al registrar usuario: " + data.error);
            }
        }
        catch(error){
            console.error("Error al registrar usuario:", error);
            alert("Error al registrar usuario");
        }

    }

    return (
        <>
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