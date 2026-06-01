import '../style/components/Button.css'

export default function Button({ children, onClick }) {
    return (
        <button className='btn' onClick={onClick}>
            {children}
        </button>
    )
}