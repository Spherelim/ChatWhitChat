import { createContext, useContext, useState, useCallback } from 'react';

import Call from '../includes/Call';

const CallContext = createContext(null);

export function CallProvider({ children }) {
    // null -> no hay llamada | { contact, callType } -> llamada activa/sonando
    const [activeCall, setActiveCall] = useState(null);

    const startCall = useCallback((contact, callType = 'audio') => {
        setActiveCall({ contact, callType });
    }, []);

    const endCall = useCallback(() => {
        setActiveCall(null);
    }, []);

    return (
        <CallContext.Provider value={{ activeCall, startCall, endCall }}>
            {children}

            {/* Se renderiza aquí, arriba de las Routes, así no se desmonta
                cuando el usuario navega entre páginas (Menu, Friends, Mapa...). */}
            {activeCall && (
                <Call
                    contact={activeCall.contact}
                    callType={activeCall.callType}
                    onHangup={endCall}
                />
            )}
        </CallContext.Provider>
    );
}

export function useCall() {
    const context = useContext(CallContext);
    if (!context) {
        throw new Error('useCall debe usarse dentro de un <CallProvider>');
    }
    return context;
}