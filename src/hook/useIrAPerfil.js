import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Devuelve una función para ir al perfil de un Usuario (al picarle a su foto o nombre).
// Si ya estás viendo ESE perfil, no hace nada: así no se vuelve a cargar la página
// ni se llena el historial (y no hay que darle varias veces "atrás").
export function useIrAPerfil() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { user } = useAuth();

    return (idUsuario) => {
        if (!idUsuario) return;

        const ruta = pathname.replace(/\/+$/, '').toLowerCase();   // "/perfil/15"
        const yaEstoyAhi =
            ruta === `/perfil/${idUsuario}` ||
            // "/perfil" a secas es MI perfil
            (ruta === '/perfil' && String(user?.id) === String(idUsuario));

        if (yaEstoyAhi) return;

        navigate(`/perfil/${idUsuario}`);
    };
}

// ok...