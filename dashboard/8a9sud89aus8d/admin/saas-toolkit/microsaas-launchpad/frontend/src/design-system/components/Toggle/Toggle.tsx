import React, { InputHTMLAttributes } from 'react'
import './Toggle.css'

export interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

export const Toggle: React.FC<ToggleProps> = ({
  size = 'md',
  label,
  className = '',
  id,
  ...props
}) => {
  const toggleId = id || `toggle-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div className={`toggle-wrapper ${className}`}>
      <label className={`toggle toggle-${size}`} htmlFor={toggleId}>
        <input type="checkbox" id={toggleId} className="toggle-input" {...props} />
        <span className="toggle-slider" />
      </label>
      {label && (
        <label htmlFor={toggleId} className="toggle-label">
          {label}
        </label>
      )}
    </div>
  )
}
