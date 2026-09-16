import '../style/components/ReportTag.css';
import { useState } from 'react';

import Ojo_Default from '../icons/ui/Report/ojo (3).png';
import Ojo_Active from '../icons/ui/Report/ojo (1).png';

export default function ReportTag(){

    const [viendo,setViendo] = useState(false);

    const handleLook = () => setViendo(prev => !prev);

    return(
        <>
            <div className='report-tag' onClick={handleLook}>
                <p className='report-name'> Reporte #0000 - A00</p>
                <div className={`report-icon-container ${viendo ? 'activo' : ''}`}>
                    <img src={viendo ? Ojo_Active : Ojo_Default} alt="Check" className='report-icon'/>
                </div>
            </div>
        </>
    );
}