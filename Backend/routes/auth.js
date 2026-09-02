import express from "express"
import db from "../database/connection.js"

import nodemailer from 'nodemailer';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
})

// =====================
// METODOS POST
// =====================

// Generar Codigo y Enviarlo al Usuario - endpoint
router.post("/send-verification",async(req,res) =>{
    const { email } = req.body;

    // Esta ya  registrado ?
    const checkSQL = "SELECT id FROM V_usuarios_Login WHERE Correo = ?";
    db.query(checkSQL, [email],async (err,result) => {
        if(err){
            return res.status(500).json({success: false,error:err.message});
        }
        if(result.length > 0){
            return res.status(400).json({
                success: false,
                error: "Este correo ya está registrado"
            });
        }

        // ojo el codigo solamente es de 10 digitos
        const Codigo = Math.floor(1000000000 + Math.random() * 9000000000).toString();

        // que paso? lo hasheamos
        const saltRounds = 10;
        const C_hash = await bcrypt.hash(Codigo,saltRounds);

        // expiración (10 min)
        const fechaExpiracion = new Date(Date.now() + 10 * 60 * 1000);

        // Guardo en la Tabla
        const insertSQL= `INSERT INTO Verif_Correo (Correo, Codigo, Fecha_Expiracion) VALUES (?,?,?)
        ON DUPLICATE KEY UPDATE Codigo = VALUES(Codigo),Fecha_Expiracion = VALUES(Fecha_Expiracion)`;

        db.query(insertSQL, [email,C_hash,fechaExpiracion], async (err,result) => {
            if(err){
                console.error("Error guardando código:", err);
                return res.status(500).json({success: false, error: err.message});
            }

            try {
                await transporter.sendMail({
                    from: `"ChatWhitChat" <${process.env.EMAIL_USER}>`,
                    to: email,
                    subject: "Verifica tu cuenta en ChatWhitChat",
                    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h1 style="color: #4e9fbe;">¡Bienvenido a ChatWhitChat!</h1>
                            <p>Estamos emocionados de tenerte con nosotros. Para completar tu registro, ingresa el siguiente código de verificación:</p>
                            <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 10px; border-radius: 10px; margin: 20px 0;">
                                ${Codigo}
                            </div>
                            <p><strong>Este código expirará en 10 minutos.</strong></p>
                            <p>Si no solicitaste este registro, ignora este mensaje.</p>
                            <hr style="margin: 20px 0;">
                            <p style="color: #666; font-size: 12px;">ChatWhitChat - Tu comunidad de chat</p>
                        </div>`
                });

                res.status(200).json({
                    success: true,
                    message: "Código enviado al correo electónico"
                });
            }
            catch (emailError){
                console.error("Error enviando correo:",emailError);
                res.status(500).json({
                    success: false,
                    error: "Error al enviar el correo de verificación"
                });
            }

        });

    });

});

// Verificar codigo y registra - endpoint
router.post("/verify-and-register", async (req, res) => {
    const { username, email, password, codigo } = req.body;

    console.log("Datos recibidos: ",{username,email,codigo});

    // wachate si esta el codigo pai
    const sql = `
        SELECT ID_Verif,Codigo,Fecha_Expiracion,Usado
        FROM Verif_Correo
        WHERE Correo = ? AND Usado = 0
        ORDER BY ID_Verif DESC
        LIMIT 1
    `;

    db.query(sql,[email],async(err,result) => {
        console.log("Verificando Codigo...");

        console.log("Registro encontrado:", result[0]);

        if(err){
            return res.status(500).json({ success: false, error: err.message});
        }

        if(result.length === 0){
            return res.status(400).json({
                success:false,
                error: "No hay código de verificación pendiente para este correo"
            });
        }

        const registro = result[0];

        // expiro?
        if(new Date() > new Date(registro.Fecha_Expiracion)){
            console.log("Codigo Expirado.");
            return res.status(400).json({
                success: false,
                error: "El código ha expirado. Solicita uno nuevo."
            });
        }

        console.log("Codigo ingresado: ",codigo);
        console.log("Código hasheado en BD: ", registro.Codigo);
        // Verifica el Codigo
        const codigoValido = await bcrypt.compare(codigo,registro.Codigo);

        console.log("¿Codigo Valido? ", codigoValido);
        
        if(!codigoValido){
            return res.status(400).json({
                success: false,
                error: "Código incorrecto"
            });
        }

        // ya está todo campión, entrale
        const registroSQL = "CALL SP_Register(?,?,?)";
        db.query(registroSQL, [username, email, password], async(err,result) =>{
            console.log("registrando...")
            if(err){
                console.error("Error registrando usuario:",err);
                return res.status(500).json({success: false, error: err.message});
            }

            // Marcar código como usado
            const updateSQL = "UPDATE Verif_Correo SET Usado = 1, Fecha_Verificacion = NOW() WHERE ID_Verif = ?";
            
            db.query(updateSQL, [registro.ID_Verif]);

            res.status(201).json({
                success: true,
                message: "Usuario registrado exitosamente"
            });

        });

    });

});

// hay no se me paso el timepo, necesito otro codigo - endpoint
router.post("/resend-verification",async (req, res)=>{
    const { email } = req.body;

    // guakala
    // const updateSQL = "UPDATE Verif_Correo SET Usado = 1 WHERE Correo = ? AND Usado = 0";
    // db.query(updateSQL,[email]);

    // Esta ya  registrado ?
    const checkSQL = "SELECT id FROM V_usuarios_Login WHERE Correo = ?";
    db.query(checkSQL, [email],async (err,result) => {
        if(err){
            return res.status(500).json({success: false,error:err.message});
        }
        if(result.length > 0){
            return res.status(400).json({
                success: false,
                error: "Este correo ya está registrado"
            });
        }

        // ojo el codigo solamente es de 10 digitos
        const Codigo = Math.floor(1000000000 + Math.random() * 9000000000).toString();

        // que paso? lo hasheamos
        const saltRounds = 10;
        const C_hash = await bcrypt.hash(Codigo,saltRounds);

        // expiración (10 min)
        const fechaExpiracion = new Date(Date.now() + 10 * 60 * 1000);

        // Actualizar la Tabla
        const updateSQL= `UPDATE Verif_Correo SET Codigo = ?,Fecha_Expiracion = ?,Usado = 0 WHERE Correo = ?`;

        db.query(updateSQL, [C_hash,fechaExpiracion,email], async (err,result) => {
            if(err){
                console.error("Error Actualizando código:", err);
                return res.status(500).json({success: false, error: err.message});
            }

            try {
                await transporter.sendMail({
                    from: `"ChatWhitChat" <${process.env.EMAIL_USER}>`,
                    to: email,
                    subject: "Verifica tu cuenta en ChatWhitChat",
                    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h1 style="color: #4e9fbe;">¡Bienvenido a ChatWhitChat!</h1>
                            <p>Estamos emocionados de tenerte con nosotros. Para completar tu registro, ingresa el siguiente código de verificación:</p>
                            <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 10px; border-radius: 10px; margin: 20px 0;">
                                ${Codigo}
                            </div>
                            <p><strong>Este código expirará en 10 minutos.</strong></p>
                            <p>Si no solicitaste este registro, ignora este mensaje.</p>
                            <hr style="margin: 20px 0;">
                            <p style="color: #666; font-size: 12px;">ChatWhitChat - Tu comunidad de chat</p>
                        </div>`
                });

                res.status(200).json({
                    success: true,
                    message: "Código enviado al correo electónico"
                });
            }
            catch (emailError){
                console.error("Error enviando correo:",emailError);
                res.status(500).json({
                    success: false,
                    error: "Error al enviar el correo de verificación"
                });
            }

        });

    });

});

// Codigo Viejo - Registro. 
// router.post("/register", (req,res)=>{
//         const {username, email, password} = req.body;

//         console.log("Datos recibidos:", { username, email, password });

//         const sql = "CALL SP_Register(?,?,?);";
//         db.query(sql, [username, email, password], (err, result) => {
//             if (err) {
//                 console.error("Error registering user:", err);
//                 res.status(500).json({ success: false, error: err.message, code: err.code });
//             } else {
//                 res.status(201).json({ success: true, message: "User registered successfully" });
//             }
//         });
// });

router.post("/login", (req,res)=>{
    const {username, password} = req.body;

    // console.log("Login attempt:", { username, password });

    // const sql = "SELECT id,Foto,Banner,Nombre_De_Usuario,Correo,Contra,Bio,Tipo FROM V_usuarios_Login WHERE Nombre_De_Usuario = ? AND Contra = ?";
    const sql = "CALL SP_Log (?,?)";

    db.query(sql, [username, password], (err, result) => {
        if (err) {
            console.error("Error logging in:", err);
            res.status(500).json({ success: false, error: err.message, code: err.code });
        } else {

            const usuarios = result[0];

            if (usuarios.length > 0) {

                const usuario = usuarios[0];

                console.log("Usuario Logueado: ");
                console.log(usuario.id);

                res.status(200).json({ 
                    success: true, 
                    message: "Login successful",
                    user:{
                        id: usuario.id,
                        username: usuario.Nombre_De_Usuario,
                        email: usuario.Correo,
                        foto: usuario.Foto,
                        banner: usuario.Banner,
                        bio: usuario.Bio,
                        rol: usuario.Tipo
                    }
                });
            } else {
                console.error("Invalid credentials");
                res.status(401).json({ success: false, error: "Invalid credentials", code: "INVALID_CREDENTIALS" });
            }
        }
    });
});

// =====================
// METODOS GET (Perras... esto lo escribi yo, ¿Cual pinche IA? 🖕)
// =====================

router.get("/friends",(req,res)=>{
    // const {username,correo} = req.body;

    const sql = `SELECT * FROM V_Usuarios;`;

    db.query(sql,(err,result)=>{
        if(err){
            console.error("Error fetching users:", err);
            res.status(500).json({success:false,error:err.message, code: err.code});
        }
        else{
            if(result.length > 0){

                const users = result.map(user => ({
                    id: user.id,
                    foto:user.Foto,
                    banner: user.Banner,
                    username: user.Nombre_De_Usuario,
                    correo: user.Correo,
                    biografia: user.Biografia,
                    estado: user.Estado
                }));

                res.status(200).json({
                    success: true,
                    message: "Usuarios Encontrados",
                    users:users
                });
            }
            else{
                res.status(404).json({success: false, error: "No encontrado", code: "NOT_FOUND"})
            }
        }
    });

});

router.get("/friends/search",(req,res)=>{
    const searchTerm = req.query.q;
    const sql = `SELECT * FROM V_Usuarios
    WHERE Nombre_De_Usuario LIKE ? OR Correo LIKE ?`;

    const searchPattern = `%${searchTerm}%`;

    db.query(sql, [searchPattern, searchPattern], (err,result) =>{
        if(err){
            console.error("Error fetching users:", err);
            res.status(500).json({success:false,error:err.message, code: err.code});
        }
        else{
            if(result.length > 0){

                const users = result.map(user => ({
                    id: user.id,
                    foto:user.Foto,
                    banner: user.Banner,
                    username: user.Nombre_De_Usuario,
                    correo: user.Correo,
                    biografia: user.Biografia,
                    estado: user.Estado
                }));

                res.status(200).json({
                    success: true,
                    message: "Usuarios Encontrados",
                    users:users
                });
            }
            else{
                res.status(404).json({success: false, error: "No encontrado", code: "NOT_FOUND"})
            }
        }
    });
});

router.get("/Perfil/Usuario/:id",(req,res)=>{
    const { id } = req.params;

    const sql = `SELECT * FROM V_Usuarios WHERE id= ?`;

    db.query(sql,[id], (err,result)=>{
        if(err){
            console.error("Error fetching user profile:", err);
            res.status(500).json({success:false, error: err.message});
        }else{
            if(result.length > 0){
                const user = {
                    id:result[0].id,
                    foto:result[0].Foto,
                    banner:result[0].Banner,
                    username:result[0].Nombre_De_Usuario,
                    correo:result[0].correo,
                    bio:result[0].Biografia,
                    estado:result[0].Estado
                };
                res.status(200).json({success:true,user});
            }else{
                res.status(404).json({
                    success:false,
                    error:"Usuario no encontrado"
                });
            }
        }
    });

});

export default router;