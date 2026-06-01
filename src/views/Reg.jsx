import '../style/Reg.css'

import Button from '../components/Button.jsx'

export default function Reg() {
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

                    <Button className='btn btn-primary' onClick={() => {}}>
                        Register
                    </Button>
                </div>
            </div>
        </>
    )
}