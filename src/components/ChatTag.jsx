import '../style/components/ChatTag.css'

import DefaultFoto from '../images/Cat.jpg';

export default function ChatTag({
    avatar = DefaultFoto,
    username = 'UserName',
    lastMessage = 'últ. vez hoy a las 4:32 p.m.',
    clock = '',
    online = false,
    active = false,
    onClick,
    actionButton = null, // NUEVO: botón opcional a la derecha (ej. +/x en modo grupo)
}){
    return(
        <div
            className={`ChatTag-container ${active ? 'is-active' : ''}`}
            onClick={onClick}
            role='button'
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick?.()}
            title={username}
        >

            <div className='ChatTag-img'>
                <img src={avatar} alt="userAvatar" />
                {online && <span className='ChatTag-status' />}
            </div>

            <div className='User-info-Chat'>
                <p className='chattag-username'>{username}</p>
                <p className='chattag-last-message'>{lastMessage}</p>
            </div>

            {actionButton
                ? <div className='chattag-action'>{actionButton}</div>
                : (clock && <span className='chattag-clock'>{clock}</span>)
            }

        </div>
    );
}