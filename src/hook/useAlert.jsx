import { useState, useCallback } from 'react'
import Alert from '../includes/Alerts'

export function useAlert(){
    const [alert,setAlert] = useState(null)

    const showAlert = useCallback((message,type = 'error', duration = 3000) =>
    {
        setAlert({message,type,duration})
    },[])

    const hideAlert = useCallback(() => {
        setAlert(null)
    }, [])

    const AlertComponent = alert ? (
        <Alert
            message={alert.message}
            type={alert.type}
            duration={alert.duration}
            onClose={hideAlert}
        />
    ) : null

    return { showAlert, hideAlert, AlertComponent }
}