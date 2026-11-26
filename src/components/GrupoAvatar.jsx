import '../style/components/GrupoAvatar.css';

import DefaultFoto from '../images/Cat.jpg';

// Icono de un grupo = las fotos de sus integrantes (máximo 4) en mosaico.
//   avatars -> [url, url, ...]
export const MAX_AVATARES_GRUPO = 4;

export default function GrupoAvatar({ avatars = [], className = '' }){
    const fotos = avatars.slice(0, MAX_AVATARES_GRUPO);
    if(fotos.length === 0) fotos.push(null);

    return(
        <div className={`GrupoAvatar GrupoAvatar-${fotos.length} ${className}`}>
            {fotos.map((foto, i) => (
                <img key={i} src={foto || DefaultFoto} alt='' />
            ))}
        </div>
    );
}