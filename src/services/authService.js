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

export async function login(username, password){
    const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({username, password})
    });
    return response.json();
}

// Le avisa a Contacts (en la misma pagina) que su lista cambió, para que se vuelva a cargar
function avisarCambioContactos(){
    window.dispatchEvent(new Event('contactos:actualizar'));
}

// userId = a quien quieres seguir | seguidorId = tú (el Usuario que inició sesión)
export async function setFollow(userId, seguidorId){
    const response = await fetch(`${API_URL}/Follow/${userId}`,{
        method: "POST",
        headers:{
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ seguidorId })
    });

    const data = await response.json();
    if(data.success) avisarCambioContactos();
    return data;
}

export async function unFollow(userId, seguidorId){
    const response = await fetch(`${API_URL}/unFollow/${userId}`,{
        method: "POST",
        headers:{
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ seguidorId })
    });

    const data = await response.json();
    if(data.success) avisarCambioContactos();
    return data;
}

// Usuarios a los que sigue userId
export async function getFollowing(userId){
    const response = await fetch(`${API_URL}/following/${userId}`,{
        method: "GET",
        headers:{
            "Content-Type": "application/json"
        }
    });
    return response.json();
}

export async function getAllUsers(){
    const response = await fetch(`${API_URL}/friends`,{
        method: "GET",
        headers:{
            "Content-Type": "application/json"
        }
    });
    return response.json();
}

export async function searchUsers(searchTerm){
    const response = await fetch(`${API_URL}/friends/search?q=${encodeURIComponent(searchTerm)}`,{
        method:"GET",
        headers:{
            "Content-Type": "application/json"
        }
    });
    return response.json();
}

export async function getUserProfile(id){
    const response = await fetch(`${API_URL}/Perfil/Usuario/${id}`,{
        method:"GET",
        headers:{
            "Content-Type":"application/json"
        }
    });

    return response.json();
}