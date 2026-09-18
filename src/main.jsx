import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import { AuthProvider } from './context/AuthContext.jsx'
import { CallProvider } from './context/CallContext.jsx'

// Paginas

import './main.css'

import Admin from './views/Admin.jsx'
import Login from './views/Log.jsx'
import Register from './views/Reg.jsx'
import Menu from './views/Menu.jsx'
import Perfil from './views/Perfil.jsx'
import Friends from './views/Friends.jsx'
import Mapa from './views/Mapa.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      {/* CallProvider va ARRIBA del Router: así el modal de llamada
          no se desmonta cuando cambias de página (Menu, Friends, Mapa...). */}
      <CallProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Menu />} />
            <Route path="/Admin" element={<Admin />} />
            {/* <Route path='/perfil/' element={<Perfil/>}/> */}
            <Route path='/perfil/:id?' element={<Perfil/>}/>
            <Route path='/Friends' element={<Friends/>}></Route>
            <Route path='/Explore' element={<Mapa/>}></Route>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        </BrowserRouter>
      </CallProvider>
    </AuthProvider>
  </StrictMode>,
)