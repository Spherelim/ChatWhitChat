
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export async function register(usuario){

    const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(usuario)
    });
    return response.json();
}

export async function login(email,password){
    const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({email, password})
    });
    return response.json();
}