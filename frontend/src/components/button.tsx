import '../styles/Button.css'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'outline' | 'link';
}

export function Button({ children, variant = 'primary', ...props }: ButtonProps) {
    return <button className={`btn btn-${variant}`} {...props}>{children}</button>
}