import '../style/components/ChatTag.css'

import DefaultFoto from '../images/Cat.jpg';
import GrupoAvatar from './GrupoAvatar';

export default function ChatTag({
    avatar = DefaultFoto,
    username = 'UserName',
    lastMessage = 'últ. vez hoy a las 4:32 p.m.',
    clock = '',
    avatars = null,      // grupos: fotos de los integrantes (se muestran máx. 4)
    unread = false,      // true = tiene mensajes nuevos (se enciende el puntito ChatTag-status)
    active = false,
    onClick,
    actionButton = null, // botón opcional a la derecha (ej. +/x en modo grupo)
}){
    return(
        <div
            className={`ChatTag-container ${active ? 'is-active' : ''} ${unread ? 'has-unread' : ''}`}
            onClick={onClick}
            role='button'
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick?.()}
            title={username}
        >

            <div className='ChatTag-img'>
                {avatars
                    ? <GrupoAvatar avatars={avatars} />
                    : <img src={avatar} alt="userAvatar" />}
                {unread && <span className='ChatTag-status' title='Mensajes nuevos' />}
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