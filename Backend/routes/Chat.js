import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";

import { query, entero, obtenerMensajes, ErrorChat, avisarUsuarios } from "./ChatCore.js";
import { opcionesUploads } from "../utils/uploadsEstaticos.js";
import { urlPublica } from "../utils/urlPublica.js";

const router = express.Router();

// ==========================================================
// ARCHIVOS (fotos, videos, documentos, audio)
// ==========================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CARPETA_UPLOADS = path.join(__dirname, "..", "uploads");     // <backend>/uploads
const CARPETA_CHAT = path.join(CARPETA_UPLOADS, "chat");
fs.mkdirSync(CARPETA_CHAT, { recursive: true });

const MAX_MB = Number(process.env.CHAT_MAX_ARCHIVO_MB) || 25;

// Extensiones permitidas -> el mime "de verdad" (lo decide el servidor por la extensión,
// no lo que diga el navegador, que se puede falsificar).
const PERMITIDOS = {
    // Fotos, video y audio (se ven dentro del chat)
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
    ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
    ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg", ".m4a": "audio/mp4", ".aac": "audio/aac",

    // Documentos
    ".pdf": "application/pdf", ".txt": "text/plain", ".rtf": "application/rtf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".docm": "application/vnd.ms-word.document.macroEnabled.12",
    ".odt": "application/vnd.oasis.opendocument.text",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xlsm": "application/vnd.ms-excel.sheet.macroEnabled.12",
    ".csv": "text/csv",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",

    // Comprimidos
    ".zip": "application/zip", ".rar": "application/vnd.rar", ".7z": "application/x-7z-compressed",

    // Código y datos (siempre se descargan, nunca se ejecutan en tu servidor)
    ".xml": "application/xml", ".json": "application/json", ".sql": "application/sql",
    ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".php": "application/x-httpd-php",
    ".cpp": "text/x-c++src", ".svg": "image/svg+xml",

    // Diseño, fuentes, 3D, música
    ".psd": "image/vnd.adobe.photoshop", ".ps": "application/postscript",
    ".indd": "application/x-indesign", ".id": "application/x-indesign",
    ".otf": "font/otf", ".ttf": "font/ttf",
    ".obj": "model/obj", ".dwg": "image/vnd.dwg", ".dxf": "image/vnd.dxf",
    ".mid": "audio/midi", ".midi": "audio/midi"
};

const upload = multer({
    storage: multer.diskStorage({
        destination: CARPETA_CHAT,
        // Nombre aleatorio: no se puede adivinar la URL de un archivo ajeno y no hay choques de nombres
        filename: (req, file, cb) => {
            cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase());
        },
    }),
    limits: { fileSize: MAX_MB * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if(!PERMITIDOS[ext]){
            return cb(new ErrorChat(`Tipo de archivo no permitido (${ext || "sin extensión"})`, 415));
        }
        cb(null, true);
    },
}).single("archivo");

// Subir un archivo. Regresa la url (relativa al servidor) para mandarla luego en el mensaje.
router.post("/chat/upload", (req, res) => {
    upload(req, res, (err) => {
        if(err){
            if(err.code === "LIMIT_FILE_SIZE"){
                return res.status(413).json({ success: false, error: `El archivo pesa más de ${MAX_MB} MB` });
            }
            if(err instanceof ErrorChat){
                return res.status(err.status).json({ success: false, error: err.message });
            }
            console.error("Error al subir archivo:", err);
            return res.status(400).json({ success: false, error: "No se pudo subir el archivo" });
        }

        if(!req.file){
            return res.status(400).json({ success: false, error: "No llegó ningún archivo" });
        }

        const ext = path.extname(req.file.filename).toLowerCase();

        res.status(200).json({
            success: true,
            archivo: {
                url: `/uploads/chat/${req.file.filename}`,
                nombre: req.file.originalname.slice(0, 150),
                mime: PERMITIDOS[ext],
                size: req.file.size,
            },
        });
    });
});

// Servir los archivos subidos (las reglas de qué se abre y qué se descarga viven en utils/uploadsEstaticos.js)
router.use("/uploads", express.static(CARPETA_UPLOADS, opcionesUploads));

// ==========================================================
// CONVERSACIONES
// ==========================================================

// Abre (o crea) el chat privado entre dos usuarios.
//   body -> { usuarioId, otroId }
router.post("/chat/privada", async (req, res) => {
    const usuarioId = entero(req.body?.usuarioId);
    const otroId = entero(req.body?.otroId);

    if(!usuarioId || !otroId){
        return res.status(400).json({ success: false, error: "Faltan usuarioId y otroId" });
    }

    // Si dos peticiones crean el mismo chat a la vez, la 2da choca con el UNIQUE: se reintenta una vez
    for(let intento = 0; intento < 2; intento++){
        try{
            const resultado = await query("CALL SP_Abrir_Conversacion_Privada(?,?)", [usuarioId, otroId]);
            const conversacionId = resultado[0][0].id_Conversacion;
            return res.status(200).json({ success: true, conversacionId });
        }
        catch(err){
            if(err.code === "ER_DUP_ENTRY" && intento === 0) continue;

            // Errores que lanza el propio SP (ej. "no puedes abrir un chat contigo mismo")
            if(err.sqlState === "45000"){
                return res.status(400).json({ success: false, error: err.sqlMessage });
            }
            if(err.code === "ER_NO_REFERENCED_ROW_2" || err.code === "ER_NO_REFERENCED_ROW"){
                console.error("Abrir chat: falló la llave foránea ->", err.sqlMessage);
                return res.status(404).json({ success: false, error: "Alguno de los usuarios no existe" });
            }

            console.error("Error al abrir conversación:", err);
            return res.status(500).json({ success: false, error: err.message });
        }
    }
});

// ==========================================================
// LISTA DE CONVERSACIONES + GRUPOS
// ==========================================================

const MAX_MIEMBROS_GRUPO = 50;

// Mis conversaciones (privadas y grupos) con sus integrantes y cuántos mensajes no he leído.
// Si se pasa "soloConversacion" regresa únicamente esa.
async function resumenConversaciones(usuarioId, req, soloConversacion = null){
    const filas = await query(
        `SELECT c.ID_Conversacion, c.Tipo, c.Nombre, c.id_Creador,
                (SELECT COUNT(*) FROM Mensaje m
                  WHERE m.id_Conversacion = c.ID_Conversacion
                    AND m.id_Remitente <> p.id_Usuario
                    AND m.ID_Mensaje > IFNULL(p.id_Ultimo_Leido, 0)) AS NoLeidos
         FROM Participante p
         INNER JOIN Conversacion c ON c.ID_Conversacion = p.id_Conversacion
         WHERE p.id_Usuario = ? ${soloConversacion ? "AND c.ID_Conversacion = ?" : ""}
         ORDER BY c.ID_Conversacion DESC`,
        soloConversacion ? [usuarioId, soloConversacion] : [usuarioId]
    );

    if(filas.length === 0) return [];

    const integrantes = await query(
        `SELECT p.id_Conversacion, u.id, u.Nombre_De_Usuario, u.Correo, u.Foto, u.Banner, u.Biografia, u.Estado
         FROM Participante p
         INNER JOIN V_Usuarios u ON u.id = p.id_Usuario
         WHERE p.id_Conversacion IN (?)
         ORDER BY p.Fecha_Union, u.id`,
        [filas.map(f => f.ID_Conversacion)]
    );

    return filas.map(f => {
        const miembros = integrantes
            .filter(i => i.id_Conversacion === f.ID_Conversacion)
            .map(u => ({
                id: u.id,
                username: u.Nombre_De_Usuario,
                email: u.Correo,
                biografia: u.Biografia,
                foto: urlPublica(u.Foto, req),
                banner: urlPublica(u.Banner, req),
                estado: u.Estado,
            }));

        return {
            conversacionId: f.ID_Conversacion,
            tipo: f.Tipo,
            nombre: f.Nombre,
            creadorId: f.id_Creador,
            noLeidos: Number(f.NoLeidos),
            miembros,
            // En los chats privados: el id de la otra persona (así el front sabe a qué contacto le toca)
            otroId: f.Tipo === "privada" ? miembros.find(m => Number(m.id) !== usuarioId)?.id ?? null : null,
        };
    });
}

router.get("/chat/resumen/:usuarioId", async (req, res) => {
    const usuarioId = entero(req.params.usuarioId);
    if(!usuarioId) return res.status(400).json({ success: false, error: "Falta usuarioId" });

    try{
        res.status(200).json({ success: true, conversaciones: await resumenConversaciones(usuarioId, req) });
    }
    catch(err){
        console.error("Error al listar conversaciones:", err);
        res.status(500).json({ success: false, error: "No se pudieron cargar los chats" });
    }
});

// Crea un grupo.  body -> { usuarioId (el que lo crea), nombre, miembros: [ids] }
// El que lo crea queda como admin; a los demás les llega "conversacion:nueva" por socket.
router.post("/chat/grupo", async (req, res) => {
    const usuarioId = entero(req.body?.usuarioId);
    const nombre = typeof req.body?.nombre === "string" ? req.body.nombre.trim() : "";
    const miembros = [...new Set((Array.isArray(req.body?.miembros) ? req.body.miembros : []).map(m => entero(m)).filter(Boolean))]
        .filter(id => id !== usuarioId);

    if(!usuarioId) return res.status(400).json({ success: false, error: "Falta usuarioId" });
    if(nombre.length < 1 || nombre.length > 60){
        return res.status(400).json({ success: false, error: "El nombre del grupo debe tener entre 1 y 60 caracteres" });
    }
    if(miembros.length < 1) return res.status(400).json({ success: false, error: "Elige al menos a 1 persona" });
    if(miembros.length + 1 > MAX_MIEMBROS_GRUPO){
        return res.status(400).json({ success: false, error: `Un grupo puede tener máximo ${MAX_MIEMBROS_GRUPO} integrantes` });
    }

    let conversacionId = null;
    try{
        const creada = await query(
            "INSERT INTO Conversacion (Tipo, Nombre, id_Creador) VALUES ('grupo', ?, ?)",
            [nombre, usuarioId]
        );
        conversacionId = creada.insertId;

        await query(
            "INSERT INTO Participante (id_Conversacion, id_Usuario, Rol) VALUES ?",
            [[[conversacionId, usuarioId, "admin"], ...miembros.map(id => [conversacionId, id, "miembro"])]]
        );
    }
    catch(err){
        // Si falló a medias no dejo un grupo vacío (los participantes se borran solos por el CASCADE)
        if(conversacionId) await query("DELETE FROM Conversacion WHERE ID_Conversacion = ?", [conversacionId]).catch(() => {});

        if(err.code === "ER_NO_REFERENCED_ROW_2" || err.code === "ER_NO_REFERENCED_ROW"){
            return res.status(404).json({ success: false, error: "Alguno de los usuarios no existe" });
        }
        console.error("Error al crear grupo:", err);
        return res.status(500).json({ success: false, error: "No se pudo crear el grupo" });
    }

    try{
        const [grupo] = await resumenConversaciones(usuarioId, req, conversacionId);
        avisarUsuarios(miembros, "conversacion:nueva", { conversacionId });
        res.status(201).json({ success: true, conversacionId, grupo });
    }
    catch(err){
        console.error("Grupo creado pero no se pudo leer:", err);
        res.status(201).json({ success: true, conversacionId, grupo: null });
    }
});

// Historial de una conversación (ya descifrado).
//   query -> usuarioId (quién pregunta), antes (opcional, para paginar), limite (opcional)
router.get("/chat/:conversacionId/mensajes", async (req, res) => {
    const conversacionId = entero(req.params.conversacionId);
    const usuarioId = entero(req.query.usuarioId);

    if(!conversacionId || !usuarioId){
        return res.status(400).json({ success: false, error: "Faltan conversacionId y usuarioId" });
    }

    try{
        const datos = await obtenerMensajes({
            conversacionId,
            usuarioId,
            antes: entero(req.query.antes),
            limite: req.query.limite,
        });
        res.status(200).json({ success: true, ...datos });
    }
    catch(err){
        if(err instanceof ErrorChat){
            return res.status(err.status).json({ success: false, error: err.message });
        }
        console.error("Error al leer mensajes:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;