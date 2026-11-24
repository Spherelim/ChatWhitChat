import { extensionDe } from './iconosArchivo.js';

// Antes de enviar un documento se le sacan dos datos para mostrarlos en el chat:
//   - paginas:    PDF y Word (.docx) = páginas, PowerPoint (.pptx) = diapositivas
//   - miniatura:  solo PDF, un Blob WebP con la parte de arriba de la primera página
// Si algo falla (PDF con contraseña, archivo raro...) simplemente regresa {} y el documento se envía igual.

const ANCHO_MINIATURA = 520;

export async function analizarDocumento(file) {
    const ext = extensionDe(file.name);

    try {
        if (ext === 'pdf') return await analizarPdf(file);
        if (ext === 'docx') return { paginas: await leerContador(file, 'docProps/app.xml', 'Pages') };
        if (ext === 'pptx') return { paginas: await leerContador(file, 'docProps/app.xml', 'Slides') };
    } catch (err) {
        console.warn('No se pudo analizar el documento:', err);
    }
    return {};
}

// ---------- PDF (pdfjs-dist se descarga solo cuando mandas un PDF) ----------
async function analizarPdf(file) {
    const pdfjs = await import('pdfjs-dist');
    const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = worker;

    const tarea = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    const pdf = await tarea.promise;

    try {
        const paginas = pdf.numPages;
        const pagina = await pdf.getPage(1);

        const escala = ANCHO_MINIATURA / pagina.getViewport({ scale: 1 }).width;
        const viewport = pagina.getViewport({ scale: escala });

        const lienzo = document.createElement('canvas');
        lienzo.width = Math.floor(viewport.width);
        lienzo.height = Math.floor(viewport.height);
        const ctx = lienzo.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, lienzo.width, lienzo.height);

        await pagina.render({ canvasContext: ctx, canvas: lienzo, viewport }).promise;

        // Solo la parte de arriba de la hoja: así la miniatura pesa menos y queda como vista previa
        const alto = Math.min(lienzo.height, Math.round(lienzo.width * 0.75));
        const recorte = document.createElement('canvas');
        recorte.width = lienzo.width;
        recorte.height = alto;
        recorte.getContext('2d').drawImage(lienzo, 0, 0);

        const miniatura = await aBlob(recorte);
        return { paginas, miniatura };
    } finally {
        tarea.destroy?.();   // libera la memoria del PDF
    }
}

// WebP si el navegador puede; si no, JPEG
const aBlob = (lienzo) => new Promise((resolve) => {
    lienzo.toBlob((webp) => {
        if (webp && webp.type === 'image/webp') return resolve(webp);
        lienzo.toBlob((jpg) => resolve(jpg), 'image/jpeg', 0.75);
    }, 'image/webp', 0.75);
});

// ---------- Word / PowerPoint: son .zip; el número de páginas está en docProps/app.xml ----------
// (lo escribe Word/PowerPoint/LibreOffice al guardar; si el archivo no lo trae, no se muestra)
async function leerContador(file, entrada, etiqueta) {
    const bytes = await leerEntradaZip(file, entrada);
    if (!bytes) return undefined;

    const xml = new TextDecoder().decode(bytes);
    const m = xml.match(new RegExp(`<${etiqueta}>(\\d+)</${etiqueta}>`));
    const n = m ? Number(m[1]) : 0;
    return n > 0 ? n : undefined;
}

// Mini lector de .zip: lee SOLO el directorio central y la entrada que se pide (no carga todo el archivo)
async function leerEntradaZip(file, nombreBuscado) {
    const cola = new Uint8Array(await file.slice(Math.max(0, file.size - 65557)).arrayBuffer());

    let i = cola.length - 22;
    while (i >= 0 && !(cola[i] === 0x50 && cola[i + 1] === 0x4b && cola[i + 2] === 0x05 && cola[i + 3] === 0x06)) i--;
    if (i < 0) return null;

    const fin = new DataView(cola.buffer, cola.byteOffset);
    const totalEntradas = fin.getUint16(i + 10, true);
    const tamDirectorio = fin.getUint32(i + 12, true);
    const inicioDirectorio = fin.getUint32(i + 16, true);

    const dir = new Uint8Array(await file.slice(inicioDirectorio, inicioDirectorio + tamDirectorio).arrayBuffer());
    const dv = new DataView(dir.buffer);

    let p = 0;
    for (let n = 0; n < totalEntradas && p + 46 <= dir.length; n++) {
        if (dv.getUint32(p, true) !== 0x02014b50) break;

        const metodo = dv.getUint16(p + 10, true);
        const tamComprimido = dv.getUint32(p + 20, true);
        const largoNombre = dv.getUint16(p + 28, true);
        const largoExtra = dv.getUint16(p + 30, true);
        const largoComentario = dv.getUint16(p + 32, true);
        const posicion = dv.getUint32(p + 42, true);
        const nombre = new TextDecoder().decode(dir.subarray(p + 46, p + 46 + largoNombre));

        if (nombre === nombreBuscado) {
            const cabecera = new DataView(await file.slice(posicion, posicion + 30).arrayBuffer());
            const inicio = posicion + 30 + cabecera.getUint16(26, true) + cabecera.getUint16(28, true);
            const comprimido = new Uint8Array(await file.slice(inicio, inicio + tamComprimido).arrayBuffer());

            if (metodo === 0) return comprimido;
            if (metodo === 8) {
                const flujo = new Blob([comprimido]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
                return new Uint8Array(await new Response(flujo).arrayBuffer());
            }
            return null;
        }

        p += 46 + largoNombre + largoExtra + largoComentario;
    }
    return null;
}