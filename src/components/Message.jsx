import '../style/components/Message.css';

/*
  own    -> true si lo mandé yo, false si lo recibí
  status -> 'seen' | 'sent' | 'error' | 'pending'  (solo aplica si own === true)
*/
export default function Message({
    text = 'Hola',
    clock = '00:00 p.m.',
    own = false,
    status = 'sent',
}){
    const clases = [
        'Message-container',
        own ? 'is-own' : 'is-received',
        own ? `is-${status}` : '',
    ].join(' ');

    return(
        <div className={`Message-row ${own ? 'row-own' : 'row-received'}`}>
            <div className={clases}>
                <p className='message-text'>{text}</p>
                <p className='message-clock'>{clock}</p>
            </div>
        </div>
    );
}