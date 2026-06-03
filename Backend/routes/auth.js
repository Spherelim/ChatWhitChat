import express from "express"
import db from "../database/connection.js"

const router = express.Router();

router.post("/register", (req,res)=>{
        const {username, email, password} = req.body;

        console.log("Datos recibidos:", { username, email, password });

        const sql = `
            INSERT INTO usuario (UserName, Correo, Contra, id_Rol) VALUES (?, ?, ?, 3)
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

    const sql = "SELECT * FROM usuario WHERE UserName = ? AND Contra = ? AND Activo = 1";

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
                        id: result[0].id_Usuario,
                        username: result[0].UserName,
                        email: result[0].Correo,
                        rol: result[0].id_Rol
                    }
                });
            } else {
                console.error("Invalid credentials");
                res.status(401).json({ success: false, error: "Invalid credentials", code: "INVALID_CREDENTIALS" });
            }
        }
    });
});

export default router;