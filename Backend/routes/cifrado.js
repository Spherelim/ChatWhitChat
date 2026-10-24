import crypto from 'crypto';

// Cifrado de los mensajes antes de guardarlos en la DB: AES-256-GCM.
//
//  - GCM cifra Y además detecta si alguien modificó el dato guardado (si lo tocan, no descifra).
//  - Cada mensaje usa un IV (número aleatorio) distinto, por eso el mismo texto
//    nunca se guarda igual dos veces.
//  - "aad" amarra el mensaje a su conversación y su remitente: si alguien con acceso
//    a la DB copia un mensaje cifrado a otra conversación, ya no descifra.
//
// Formato guardado:  v1:iv:tag:datos   (todo en base64)
// El "v1" sirve para poder cambiar de llave/algoritmo en el futuro sin perder lo viejo.
//
// La llave vive en el .env (CHAT_KEY), NUNCA en la DB ni en el repositorio.
// Generar una:  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

const VERSION = 'v1';
let llaveCache = null;

// Se lee de forma "perezosa" (al usarse) para no depender del orden en que carga dotenv.
function obtenerLlave(){
    if(llaveCache) return llaveCache;

    const base64 = process.env.CHAT_KEY;
    if(!base64) throw new Error('Falta CHAT_KEY en el .env (32 bytes en base64)');

    const llave = Buffer.from(base64, 'base64');
    if(llave.length !== 32) throw new Error(`CHAT_KEY debe medir 32 bytes en base64 (ahorita mide ${llave.length})`);

    llaveCache = llave;
    return llave;
}

export function cifrar(textoPlano, aad = ''){
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', obtenerLlave(), iv);
    cipher.setAAD(Buffer.from(aad));

    const datos = Buffer.concat([cipher.update(textoPlano, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return [VERSION, iv.toString('base64'), tag.toString('base64'), datos.toString('base64')].join(':');
}

export function descifrar(paquete, aad = ''){
    const [version, iv, tag, datos] = String(paquete).split(':');
    if(version !== VERSION) throw new Error('Versión de cifrado desconocida');

    const decipher = crypto.createDecipheriv('aes-256-gcm', obtenerLlave(), Buffer.from(iv, 'base64'));
    decipher.setAAD(Buffer.from(aad));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));

    return Buffer.concat([decipher.update(Buffer.from(datos, 'base64')), decipher.final()]).toString('utf8');
}