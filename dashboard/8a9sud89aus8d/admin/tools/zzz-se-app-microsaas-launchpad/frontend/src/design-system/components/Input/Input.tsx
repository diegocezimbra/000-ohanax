import React, { forwardRef, InputHTMLAttributes } from 'react'
import './Input.css'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  onRightIconClick?: () => void
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, leftIcon, rightIcon, onRightIconClick, className = '', ...props }, ref) => {
    const classes = [
      'input-wrapper',
      error && 'input-error',
      leftIcon && 'has-left-icon',
      rightIcon && 'has-right-icon',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div className={classes}>
        {leftIcon && <span className="input-icon input-icon-left">{leftIcon}</span>}
        <input ref={ref} className="input" {...props} />
        {rightIcon && (
          <span
            className={`input-icon input-icon-right ${onRightIconClick ? 'clickable' : ''}`}
            onClick={onRightIconClick}
          >
            {rightIcon}
          </span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
