import db from "../database/connection.js";
import { cifrar, descifrar } from "./cifrado.js";

// Lógica compartida del chat: la usan las rutas REST (chat.js) y el socket (socket.js).

// db.query trabaja con callbacks; esto lo vuelve una promesa para poder usar async/await
export function query(sql, params = []){
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, result) => err ? reject(err) : resolve(result));
    });
}

// Error "esperado" (validaciones): trae el status HTTP que le toca
export class ErrorChat extends Error {
    constructor(mensaje, status = 400){
        super(mensaje);
        this.status = status;
    }
}

// Convierte a entero positivo, o null si no lo es
export function entero(valor){
    const n = Number(valor);
    return Number.isInteger(n) && n > 0 ? n : null;
}

export const TIPOS = ['texto', 'media', 'documento', 'audio', 'ubicacion', 'itinerario'];

const MAX_TEXTO = 4000;

// Los archivos SOLO pueden apuntar a lo que subió nuestro propio /chat/upload.
// Así nadie puede mandar un link externo (rastreadores, "javascript:", etc.) dentro de un mensaje.
const URL_ARCHIVO = /^\/uploads\/chat\/[0-9a-f-]{36}\.[a-z0-9]{1,5}$/;

const texto = (valor, max, nombre) => {
    if(typeof valor !== 'string' || !valor.trim()) throw new ErrorChat(`${nombre} no es válido`);
    if(valor.length > max) throw new ErrorChat(`${nombre} es demasiado largo`);
    return valor;
};

// Revisa el contenido según el tipo y deja SOLO los campos permitidos.
export function validarContenido(tipo, c){
    if(!c || typeof c !== 'object') throw new ErrorChat('Contenido inválido');

    switch(tipo){
        case 'texto':
            return { texto: texto(c.texto, MAX_TEXTO, 'El mensaje').trim() };

        case 'media':
        case 'documento':
        case 'audio': {
            if(typeof c.url !== 'string' || !URL_ARCHIVO.test(c.url)) throw new ErrorChat('Archivo no válido');
            const size = Number(c.size);
            return {
                url: c.url,
                nombre: typeof c.nombre === 'string' && c.nombre.trim() ? c.nombre.slice(0, 150) : 'archivo',
                mime: typeof c.mime === 'string' ? c.mime.slice(0, 100) : '',
                size: Number.isFinite(size) && size >= 0 ? size : 0,
            };
        }

        case 'ubicacion': {
            const lat = Number(c.lat);
            const lng = Number(c.lng);
            if(!Number.isFinite(lat) || lat < -90 || lat > 90) throw new ErrorChat('Latitud inválida');
            if(!Number.isFinite(lng) || lng < -180 || lng > 180) throw new ErrorChat('Longitud inválida');
            return { lat, lng };
        }

        case 'itinerario': {
            const foto = typeof c.foto === 'string' && c.foto.length <= 500
                && (c.foto.startsWith('https://') || c.foto.startsWith('/uploads/'))
                ? c.foto : null;
            return {
                itinerarioId: c.itinerarioId ?? null,
                nombre: texto(c.nombre, 100, 'El nombre del itinerario'),
                foto,
            };
        }

        default:
            throw new ErrorChat('Tipo de mensaje no válido');
    }
}

// El "aad" amarra el cifrado a la conversación y al remitente (ver cifrado.js)
const aadDe = (conversacionId, remitenteId) => `${conversacionId}:${remitenteId}`;

export async function idsParticipantes(conversacionId){
    const filas = await query('SELECT id_Usuario FROM Participante WHERE id_Conversacion = ?', [conversacionId]);
    return filas.map(f => f.id_Usuario);
}

// Valida, cifra y guarda un mensaje. Regresa el mensaje (en claro, listo para mandarlo a los
// clientes) y los ids de los participantes, para saber a quién avisarle.
export async function guardarMensaje({ conversacionId, remitenteId, tipo, contenido }){
    if(!TIPOS.includes(tipo)) throw new ErrorChat('Tipo de mensaje no válido');

    const participantes = await idsParticipantes(conversacionId);
    if(!participantes.includes(remitenteId)) throw new ErrorChat('No perteneces a esta conversación', 403);

    const limpio = validarContenido(tipo, contenido);

    // La fecha la pone el servidor (no el cliente, que puede tener el reloj mal)
    const fecha = new Date();
    const paquete = cifrar(JSON.stringify(limpio), aadDe(conversacionId, remitenteId));

    const resultado = await query(
        'INSERT INTO Mensaje (id_Conversacion, id_Remitente, Tipo, Contenido, Fecha_Envio) VALUES (?,?,?,?,?)',
        [conversacionId, remitenteId, tipo, paquete, fecha]
    );

    return {
        mensaje: {
            id: resultado.insertId,
            conversacionId,
            remitenteId,
            tipo,
            contenido: limpio,
            fecha: fecha.toISOString(),
        },
        participantes,
    };
}

// Fila de la DB -> mensaje descifrado
export function filaAMensaje(f){
    const base = {
        id: f.ID_Mensaje,
        conversacionId: f.id_Conversacion,
        remitenteId: f.id_Remitente,
        fecha: new Date(f.Fecha_Envio).toISOString(),
    };

    try{
        const contenido = JSON.parse(descifrar(f.Contenido, aadDe(f.id_Conversacion, f.id_Remitente)));
        return { ...base, tipo: f.Tipo, contenido };
    }
    catch(err){
        // Un mensaje dañado (o con otra llave) no debe tumbar todo el historial
        console.error(`No se pudo descifrar el mensaje ${f.ID_Mensaje}:`, err.message);
        return { ...base, tipo: 'texto', contenido: { texto: '⚠️ No se pudo descifrar este mensaje' } };
    }
}

// Historial paginado: los más nuevos primero en la consulta, pero se regresan en orden cronológico.
//   antes  -> solo mensajes con id menor a este (para "cargar más antiguos")
//   limite -> cuántos regresar (máx. 100)
export async function obtenerMensajes({ conversacionId, usuarioId, antes = null, limite = 50 }){
    const participantes = await idsParticipantes(conversacionId);
    if(!participantes.includes(usuarioId)) throw new ErrorChat('No perteneces a esta conversación', 403);

    const tope = Math.min(Math.max(parseInt(limite, 10) || 50, 1), 100);

    const filas = await query(
        `SELECT ID_Mensaje, id_Conversacion, id_Remitente, Tipo, Contenido, Fecha_Envio
         FROM Mensaje
         WHERE id_Conversacion = ? ${antes ? 'AND ID_Mensaje < ?' : ''}
         ORDER BY ID_Mensaje DESC
         LIMIT ${tope + 1}`,                       // pido 1 de más para saber si hay más antiguos
        antes ? [conversacionId, antes] : [conversacionId]
    );

    const hayMas = filas.length > tope;
    const mensajes = filas.slice(0, tope).reverse().map(filaAMensaje);

    // Hasta dónde ha leído cada quien (para pintar los "visto" de mis mensajes)
    const lecturas = await query(
        'SELECT id_Usuario, id_Ultimo_Leido FROM Participante WHERE id_Conversacion = ?',
        [conversacionId]
    );

    return {
        mensajes,
        hayMas,
        participantes: lecturas.map(l => ({ usuarioId: l.id_Usuario, ultimoLeido: l.id_Ultimo_Leido })),
    };
}

// Marca como leído hasta "hastaId". Nunca baja el marcador y no deja marcar mensajes que no existen.
export async function marcarLeido({ conversacionId, usuarioId, hastaId }){
    const participantes = await idsParticipantes(conversacionId);
    if(!participantes.includes(usuarioId)) throw new ErrorChat('No perteneces a esta conversación', 403);

    const [fila] = await query(
        'SELECT IFNULL(MAX(ID_Mensaje), 0) AS tope FROM Mensaje WHERE id_Conversacion = ? AND ID_Mensaje <= ?',
        [conversacionId, hastaId]
    );

    // El driver regresa el resultado de MAX()/IFNULL() como texto ('123'), por eso el Number()
    const tope = Number(fila.tope);

    await query(
        'UPDATE Participante SET id_Ultimo_Leido = GREATEST(IFNULL(id_Ultimo_Leido, 0), ?) WHERE id_Conversacion = ? AND id_Usuario = ?',
        [tope, conversacionId, usuarioId]
    );

    return { participantes, hastaId: tope };
}