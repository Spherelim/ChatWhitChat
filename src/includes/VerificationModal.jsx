import { useState } from "react";
import '../style/includes/VerificationModal.css';

export default function VerificationModal({email, onVerify, onResend, onCancel}){
    const [code, setCode] = useState(['','','','','','','','','','']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resendLoading, setResendLoading] = useState(false);

    const handleCodeChange = (index,value) =>{
        if(value.length <= 1){
            const newCode = [...code];
            newCode[index] = value;
            setCode(newCode);

            if(value !== '' && index < 9 ){
                document.getElementById(`code-input-${index + 1}`).focus();
            }
        }
    };

    const handleKeyDown = (index, e) => {
        // Mover al input anterior con Backspace
        if (e.key === 'Backspace' && code[index] === '' && index > 0) {
            document.getElementById(`code-input-${index - 1}`).focus();
        }
    };

    const handleVerify = async () => {
        const fullCode = code.join('');
        if (fullCode.length !== 10) {
            setError('Ingresa los 10 dígitos del código');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await onVerify(fullCode);
        } catch (err) {
            setError(err.message || 'Código incorrecto');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResendLoading(true);
        setError('');
        try {
            await onResend();
            setCode(['', '', '', '', '', '', '', '', '', '']);
            document.getElementById('code-input-0').focus();
        } catch (err) {
            setError(err.message || 'Error al reenviar el código');
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Verificación de Correo</h2>
                <p>
                    Hemos enviado un código de verificación a <strong>{email}</strong>
                </p>
                <p className="modal-instructions">
                    Por favor, revisa tu correo e ingresa los 10 dígitos del código:
                </p>

                <div className="code-inputs">
                    {code.map((digit, index) => (
                        <input
                            key={index}
                            id={`code-input-${index}`}
                            type="text"
                            maxLength="1"
                            className="code-input"
                            value={digit}
                            onChange={(e) => handleCodeChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            autoFocus={index === 0}
                        />
                    ))}
                </div>

                {error && <p className="modal-error">{error}</p>}

                <p className="form-link" onClick={handleResend} diabled={resendLoading}> ¿No llego el correo? {resendLoading ? 'Enviando...' : 'Reenviar código'} </p>
                
                <div className="modal-actions">
                    <button 
                        className="btn btn-primary" 
                        onClick={handleVerify}
                        disabled={loading}
                    >
                        {loading ? 'Verificando...' : 'Verificar'}
                    </button>
                    {/* <button 
                        className="btn btn-secondary" 
                        onClick={handleResend}
                        disabled={resendLoading}
                    >
                        {resendLoading ? 'Enviando...' : 'Reenviar código'}
                    </button> */}
                    <button 
                        className="btn btn-danger" 
                        onClick={onCancel}
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );

}