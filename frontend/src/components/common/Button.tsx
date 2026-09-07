import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
}

export function Button({ variant = 'primary', className = '', type = 'button', ...rest }: ButtonProps) {
  const variantClass = variant === 'primary' ? '' : `button--${variant}`
  return <button type={type} className={`button ${variantClass} ${className}`.trim()} {...rest} />
}
