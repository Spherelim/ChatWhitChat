// Iconos de los documentos del chat: salen de  src/icons/extencion/<ext>.png
// (apk, cad, cpp, css, dll, doc, exe, html, id, indd, iso, js, midi, obj, otf, pdf, php, pptx, ps, rar, sql, svg, txt, xlr, xls, xml, xxl, zip)
const modulos = import.meta.glob('../icons/extencion/*.{png,PNG,webp,svg}', { eager: true, import: 'default' });

const iconos = {};
for (const [ruta, url] of Object.entries(modulos)) {
    const nombre = ruta.split('/').pop().replace(/\.[^.]+$/, '').toLowerCase();
    iconos[nombre] = url;
}

// Extensiones que no tienen icono propio usan el de su "familia"
const FAMILIA = {
    docx: 'doc', docm: 'doc', dot: 'doc', dotx: 'doc', rtf: 'doc', odt: 'doc',
    xlsx: 'xls', xlsm: 'xls', xlsb: 'xls', csv: 'xls',
    ppt: 'pptx', pptm: 'pptx', pps: 'pptx', ppsx: 'pptx',
    htm: 'html', xhtml: 'html',
    jsx: 'js', mjs: 'js', json: 'js',
    c: 'cpp', h: 'cpp', hpp: 'cpp', cc: 'cpp',
    mid: 'midi',
    psd: 'ps',
    dwg: 'cad', dxf: 'cad',
    ttf: 'otf',
    '7z': 'zip', tar: 'zip', gz: 'zip',
};

export const extensionDe = (nombre = '') => {
    const i = nombre.lastIndexOf('.');
    return i === -1 ? '' : nombre.slice(i + 1).toLowerCase();
};

// -> url del icono, o null si no hay (el Message usa 📎 en ese caso)
// jeje clipi como emoji jeje.
export function iconoDeArchivo(nombre) {
    const ext = extensionDe(nombre);
    return iconos[ext] || iconos[FAMILIA[ext]] || null;
}

// Lo que acepta el "Documentos" del menú del chat (tiene que coincidir con PERMITIDOS de backend/routes/Chat.js)
export const EXTENSIONES_DOCUMENTO = [
    'pdf', 'txt', 'rtf', 'doc', 'docx', 'docm', 'odt', 'xls', 'xlsx', 'xlsm', 'csv', 'ppt', 'pptx',
    'zip', 'rar', '7z',
    'xml', 'json', 'sql', 'html', 'css', 'js', 'php', 'cpp', 'svg',
    'psd', 'ps', 'indd', 'id', 'otf', 'ttf', 'obj', 'dwg', 'dxf', 'mid', 'midi',
];