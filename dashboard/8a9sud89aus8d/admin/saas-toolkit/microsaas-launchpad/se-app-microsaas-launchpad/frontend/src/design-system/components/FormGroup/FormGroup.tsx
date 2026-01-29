import React, { HTMLAttributes } from 'react'
import './FormGroup.css'

export interface FormGroupProps extends HTMLAttributes<HTMLDivElement> {
  label?: string
  htmlFor?: string
  error?: string
  hint?: string
  required?: boolean
}

export const FormGroup: React.FC<FormGroupProps> = ({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`form-group ${error ? 'has-error' : ''} ${className}`} {...props}>
      {label && (
        <label htmlFor={htmlFor} className="form-label">
          {label}
          {required && <span className="form-required">*</span>}
        </label>
      )}
      {children}
      {error && <span className="form-error">{error}</span>}
      {hint && !error && <span className="form-hint">{hint}</span>}
    </div>
  )
}
