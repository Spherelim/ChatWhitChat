// Las fotos se guardan en la BD solo como ruta ("/uploads/perfiles/xxx.webp").
// Esto la convierte en una URL completa para que cualquier componente (NavBar, chat,
// Post, Perfil...) pueda usarla directo en un <img src=...>.
//
// Si pones PUBLIC_URL en el .env (ej. https://api.midominio.com) usa esa;
// si no, la saca de la petición (http://localhost:3000, o la IP si pruebamos desde el celular).
export function urlPublica(ruta, req) {
    if (!ruta) return null;
    if (/^https?:\/\//i.test(ruta)) return ruta;

    const base = process.env.PUBLIC_URL
        || (req ? `${req.protocol}://${req.get('host')}` : `http://localhost:${process.env.PORT || 3000}`);

    return `${base.replace(/\/$/, '')}${ruta}`;
}