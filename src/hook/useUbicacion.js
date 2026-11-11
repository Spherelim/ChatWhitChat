import { useCallback, useEffect, useRef, useState } from 'react';

// Sigue la ubicación del usuario en tiempo real con la API de geolocalización del navegador.
// La ubicación se queda en el navegador: no se manda a ningún servidor.
//
// Estados:
//   'apagada'   -> no se está siguiendo (estado inicial)
//   'buscando'  -> ya se pidió, esperando la primera lectura (o el permiso)
//   'activa'    -> ya hay posición y se actualiza sola cuando el usuario se mueve
//   'denegada'  -> el usuario (o el navegador) no dio permiso
//
// Uso:
//   const { estado, posicion, aviso, iniciar, detener } = useUbicacion();
//   posicion -> { lat, lng, precision (metros), momento }

// Códigos de GeolocationPositionError
const PERMISO_DENEGADO = 1;
const SIN_SENAL = 2;
const TIEMPO_AGOTADO = 3;

const OPCIONES = {
    enableHighAccuracy: true,   // usa el GPS si lo hay (más preciso, gasta más batería)
    maximumAge: 5000,           // acepta una lectura de hace máximo 5 s
    timeout: 20000,
};

// Pregunta si el usuario ya dio permiso de ubicación (sin pedírselo). Regresa una promesa,
// o null si este navegador no permite consultarlo (algunos no soportan este permiso).
function consultarPermiso() {
    try {
        return navigator.permissions?.query?.({ name: 'geolocation' }) ?? null;
    } catch {
        return null;
    }
}

export default function useUbicacion({ alAutoIniciar } = {}) {
    const [estado, setEstado] = useState('apagada');
    const [posicion, setPosicion] = useState(null);
    const [aviso, setAviso] = useState(null);       // texto para mostrarle al usuario

    const vigilanciaRef = useRef(null);             // id que regresa watchPosition
    const alAutoIniciarRef = useRef(alAutoIniciar);

    useEffect(() => {
        alAutoIniciarRef.current = alAutoIniciar;
    });

    const apagarVigilancia = useCallback(() => {
        if (vigilanciaRef.current !== null) {
            navigator.geolocation?.clearWatch(vigilanciaRef.current);
            vigilanciaRef.current = null;
        }
    }, []);

    const detener = useCallback(() => {
        apagarVigilancia();
        setEstado('apagada');
        setPosicion(null);
        setAviso(null);
    }, [apagarVigilancia]);

    const iniciar = useCallback(() => {
        if (vigilanciaRef.current !== null) return;     // ya se está siguiendo

        if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
            setAviso('Tu navegador no permite obtener la ubicación.');
            return;
        }

        // El navegador solo da la ubicación en páginas seguras (https) o en localhost.
        // Ojo: abrir el servidor de desarrollo desde el celular con http://192.168.x.x NO cuenta.
        if (window.isSecureContext === false) {
            setAviso('La ubicación solo funciona en una página segura (https) o en localhost.');
            return;
        }

        setEstado('buscando');
        setAviso(null);

        vigilanciaRef.current = navigator.geolocation.watchPosition(
            (lectura) => {
                setPosicion({
                    lat: lectura.coords.latitude,
                    lng: lectura.coords.longitude,
                    precision: lectura.coords.accuracy,
                    momento: lectura.timestamp,
                });
                setEstado('activa');
                setAviso(null);
            },
            (error) => {
                if (error.code === PERMISO_DENEGADO) {
                    apagarVigilancia();
                    setEstado('denegada');
                    setPosicion(null);
                    setAviso('No tienes permiso de ubicación para este sitio. Actívalo desde el candado de la barra de direcciones y vuelve a intentarlo.');
                } else if (error.code === SIN_SENAL) {
                    setAviso('No se pudo determinar tu ubicación. Revisa que tengas GPS o conexión.');
                } else if (error.code === TIEMPO_AGOTADO) {
                    setAviso('Está tardando en obtener tu ubicación…');
                } else {
                    setAviso('No se pudo obtener tu ubicación.');
                }
                // Con SIN_SENAL y TIEMPO_AGOTADO el navegador sigue intentando solo: no se apaga nada
            },
            OPCIONES
        );
    }, [apagarVigilancia]);

    // Si el usuario ya había dado permiso antes, arranca sola (sin volver a preguntar).
    // Si no lo había dado, NO se pide nada hasta que él pique el botón.
    useEffect(() => {
        let cancelado = false;

        const consulta = consultarPermiso();
        if (!consulta) return;

        consulta
            .then((permiso) => {
                if (cancelado || permiso.state !== 'granted') return;
                iniciar();
                alAutoIniciarRef.current?.();
            })
            .catch(() => {});

        return () => { cancelado = true; };
    }, [iniciar]);

    // Al salir de la página se deja de seguir (ahorra batería y es lo correcto por privacidad)
    useEffect(() => apagarVigilancia, [apagarVigilancia]);

    return { estado, posicion, aviso, iniciar, detener };
}