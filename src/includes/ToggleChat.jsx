import { useState } from 'react';

import '../style/includes/ToggleChat.css'

import ChatIcon from '../icons/ui/chat/faro.png'
import Contacts from '../views/ChildViews/Contacts'
import Chat from '../views/ChildViews/Chat'

export default function ToggleChat(){
    const [open, setOpen] = useState(false);
    const [activeChat, setActiveChat] = useState(null);   // null = solo contactos

    const handleToggle = () => {
        setOpen(prev => {
            if (prev) setActiveChat(null);   // al cerrar, resetea la vista
            return !prev;
        });
    };

    return(
        <div className={`toggle-chat ${open ? 'is-open' : ''} ${activeChat ? 'chat-open' : ''}`}>

            <button
                type="button"
                className='eyelash'
                onClick={handleToggle}
                aria-expanded={open}
                aria-label={open ? 'Cerrar chat' : 'Abrir chat'}
            >
                <img src={ChatIcon} alt="chat" className='chat-icon'/>
            </button>

            <div className='chat-panel'>
                <Contacts
                    collapsed={!!activeChat}
                    activeId={activeChat?.id}
                    onSelect={setActiveChat}
                />

                {activeChat && (
                    <Chat
                        contact={activeChat}
                        onBack={() => setActiveChat(null)}
                    />
                )}
            </div>

        </div>
    );
}