import '../style/Log.css'

import Button from '../components/Button.jsx'

export default function Log() {
    return (
        <>
            <div className='log'>
                <h1 className='form-title'>Login</h1>
                <div className='form-container'>
                    <input type="text" placeholder='Username' className='form-control'/>
                    <input type="password" placeholder='Password' className='form-control'/>
                    
                    {/* Registrarse si no tiene cuenta */}
                    <p className='form-link'>¿No tienes una cuenta? <a href="/register" className='form-link'>Registrate</a></p>

                    <Button className='btn btn-primary' onClick={() => {}}>
                        Login
                    </Button>
                </div>
            </div>
        </>
    )
}