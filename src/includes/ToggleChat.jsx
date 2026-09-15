import '../style/includes/ToggleChat.css'

import ChatIcon from '../icons/ui/chat/faro.png'

export default function ToggleChat(){
    return(
        <>
            <div className='toggle-chat'>
                <div className='eyelash'>
                    <img src={ChatIcon} alt="chat" className='chat-icon'/>
                </div>
            </div>
        </>
    );
}