import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { useId } from 'react'

interface FieldShellProps {
  label: string
  error?: string
  hint?: ReactNode
  children: (id: string, invalid: boolean) => ReactNode
}

function FieldShell({ label, error, hint, children }: FieldShellProps) {
  const id = useId()
  const invalid = Boolean(error)
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {children(id, invalid)}
      {hint && !error && <span className="muted">{hint}</span>}
      {error && (
        <span className="field__error" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string
  error?: string
  hint?: ReactNode
}

export function TextField({ label, error, hint, className = '', ...rest }: TextFieldProps) {
  return (
    <FieldShell label={label} error={error} hint={hint}>
      {(id, invalid) => (
        <input
          id={id}
          className={`input ${invalid ? 'input--invalid' : ''} ${className}`.trim()}
          aria-invalid={invalid || undefined}
          {...rest}
        />
      )}
    </FieldShell>
  )
}

interface TextAreaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label: string
  error?: string
  hint?: ReactNode
}

export function TextAreaField({ label, error, hint, className = '', ...rest }: TextAreaFieldProps) {
  return (
    <FieldShell label={label} error={error} hint={hint}>
      {(id, invalid) => (
        <textarea
          id={id}
          className={`textarea ${invalid ? 'textarea--invalid' : ''} ${className}`.trim()}
          aria-invalid={invalid || undefined}
          {...rest}
        />
      )}
    </FieldShell>
  )
}
