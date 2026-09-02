import '../style/Admin.css'

import NavBar from '../includes/NavBar'

export default function Admin(){
    return(
        <>
        <div className='admin-layout'>
            <NavBar />
            <div className='Admin-Container'>
                <p className='form-mensaje'>Hola Soy Admin...</p>
            </div>
        </div>
        </>
    )
}