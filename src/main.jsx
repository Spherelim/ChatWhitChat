import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Paginas

import './main.css'

import Login from './views/Log.jsx'
import Register from './views/Reg.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* <Login /> */}
    <Register />
  </StrictMode>,
)
