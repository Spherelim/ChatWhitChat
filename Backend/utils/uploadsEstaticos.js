import path from 'path';

// Cómo se sirve la carpeta /uploads.
// Solo lo que es seguro verlo "dentro del navegador" (imágenes, video, audio, PDF y .txt) se abre ahí.
// TODO lo demás (zip, docx, xml, html, svg, js...) se manda con "Content-Disposition: attachment":
// el navegador lo DESCARGA y nunca lo ejecuta/renderiza desde el servidor.
const SE_ABRE_EN_EL_NAVEGADOR = new Set([
    '.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif',
    '.mp4', '.webm', '.mov', '.m4v', '.ogv',
    '.mp3', '.wav', '.ogg', '.m4a', '.aac',
    '.pdf', '.txt',
]);

export const opcionesUploads = {
    index: false,
    setHeaders: (res, rutaArchivo) => {
        // Que el navegador NO adivine el tipo (evita que un archivo disfrazado se ejecute como página)
        res.setHeader('X-Content-Type-Options', 'nosniff');

        if (!SE_ABRE_EN_EL_NAVEGADOR.has(path.extname(rutaArchivo).toLowerCase())) {
            res.setHeader('Content-Disposition', 'attachment');
        }
    },
};