import '../style/includes/ToggleMap.css'

export default function ToggleMap() {

    const handleExplore = () => {
        // quiero intentar poner navigate('/Explore') pero no me funciona, asi que por ahora lo hago con window.location.href
        window.location.href = "/Explore";
    }

    return(
        <div className='Toggle-Map'>
            <button type="button" className="eyelash" onClick={handleExplore}>
                <svg className="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                    <line x1="2" y1="12" x2="22" y2="12" strokeWidth="2"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" strokeWidth="2"/>
                </svg>
            </button>
        </div>
    );
}