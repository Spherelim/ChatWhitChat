import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";

import { query, entero, obtenerMensajes, ErrorChat } from "./ChatCore.js";

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
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
    ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
    ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg", ".m4a": "audio/mp4", ".aac": "audio/aac",
    ".pdf": "application/pdf", ".txt": "text/plain",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

// Estos se descargan en vez de abrirse en el navegador
const SOLO_DESCARGA = new Set([".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"]);

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

// Servir los archivos subidos
router.use("/uploads", express.static(CARPETA_UPLOADS, {
    index: false,
    setHeaders: (res, rutaArchivo) => {
        // Que el navegador NO adivine el tipo (evita que un archivo disfrazado se ejecute como página)
        res.setHeader("X-Content-Type-Options", "nosniff");
        if(SOLO_DESCARGA.has(path.extname(rutaArchivo).toLowerCase())){
            res.setHeader("Content-Disposition", "attachment");
        }
    },
}));

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