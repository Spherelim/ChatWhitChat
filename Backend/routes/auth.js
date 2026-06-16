import express from "express"
import db from "../database/connection.js"

const router = express.Router();

// =====================
// METODOS POST
// =====================

router.post("/register", (req,res)=>{
        const {username, email, password} = req.body;

        console.log("Datos recibidos:", { username, email, password });

        const sql = `
            CALL SP_Register(?,?,?);
        `;
        db.query(sql, [username, email, password], (err, result) => {
            if (err) {
                console.error("Error registering user:", err);
                res.status(500).json({ success: false, error: err.message, code: err.code });
            } else {
                res.status(201).json({ success: true, message: "User registered successfully" });
            }
        });
});

router.post("/login", (req,res)=>{
    const {username, password} = req.body;

    // console.log("Login attempt:", { username, password });

    const sql = "SELECT id,Foto,Banner,Nombre_De_Usuario,Correo,Contra,Bio,Tipo FROM V_usuarios_Login WHERE Nombre_De_Usuario = ? AND Contra = ?";

    db.query(sql, [username, password], (err, result) => {
        if (err) {
            console.error("Error logging in:", err);
            res.status(500).json({ success: false, error: err.message, code: err.code });
        } else {
            if (result.length > 0) {
                res.status(200).json({ 
                    success: true, 
                    message: "Login successful",
                    user:{
                        id: result[0].id,
                        username: result[0].Nombre_De_Usuario,
                        email: result[0].Correo,
                        foto: result[0].Foto,
                        banner: result[0].Banner,
                        bio: result[0].Bio,
                        rol: result[0].Tipo
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