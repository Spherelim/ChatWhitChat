import '../style/components/EmojiPiker.css';

const EMOJIS = [
    '😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😜', '🤔', '🙄',
    '😴', '😭', '😡', '🥳', '😎', '🤯', '🥺', '😇', '🤗', '😅',
    '👍', '👎', '👏', '🙏', '💪', '🤝', '✌️', '🤞', '👌', '🤙',
    '❤️', '💙', '💚', '💛', '🧡', '💜', '🖤', '🤍', '💔', '💯',
    '🔥', '✨', '🎉', '🎂', '🎁', '⭐', '🌟', '☀️', '🌙', '⚡',
    '🍕', '🍔', '🍟', '🍦', '☕', '🍺', '🍻', '🎮', '⚽', '🏀',
];

export default function EmojiPicker({ onSelect }){
    return (
        <div className='EmojiPicker-container'>
            <div className='emoji-grid'>
                {EMOJIS.map((emoji) => (
                    <button
                        key={emoji}
                        type='button'
                        className='emoji-btn'
                        onClick={() => onSelect?.(emoji)}
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </div>
    );
}