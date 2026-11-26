import { useEffect, useState } from 'react';

import { conectarSocket } from '../services/Socket.js';

// ¿Quién está conectado AHORA? (lo sabe el servidor por los sockets abiertos, no la BD)
//   ids  -> ids de usuarios a vigilar
//   miId -> mi id (para conectar el socket)
// Regresa un Set con los ids que están en línea.

// así lo que pide Leo "Presencia".
export function usePresencia(ids = [], miId){
    const [enLinea, setEnLinea] = useState(() => new Set());
    const clave = [...new Set(ids)].sort().join(',');

    useEffect(() => {
        const lista = clave ? clave.split(',').map(Number) : [];
        if(!miId || lista.length === 0){
            setEnLinea(prev => prev.size ? new Set() : prev);
            return;
        }

        const socket = conectarSocket(miId);

        const consultar = () => {
            socket.timeout(5000).emit('presencia:consultar', { ids: lista }, (err, res) => {
                if(!err && res?.ok) setEnLinea(new Set(res.enLinea));
            });
        };

        const alCambiar = ({ usuarioId, enLinea: conectado }) => {
            if(!lista.includes(usuarioId)) return;
            setEnLinea(prev => {
                const nuevo = new Set(prev);
                if(conectado) nuevo.add(usuarioId); else nuevo.delete(usuarioId);
                return nuevo;
            });
        };

        if(socket.connected) consultar();
        socket.on('connect', consultar);          // al conectar y al reconectar
        socket.on('presencia:cambio', alCambiar);

        return () => {
            socket.off('connect', consultar);
            socket.off('presencia:cambio', alCambiar);
        };
    }, [miId, clave]);

    return enLinea;
}