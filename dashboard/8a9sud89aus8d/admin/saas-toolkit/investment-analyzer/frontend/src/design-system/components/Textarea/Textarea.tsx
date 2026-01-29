import { forwardRef, TextareaHTMLAttributes } from 'react'
import './Textarea.css'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, resize = 'vertical', className = '', style, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`textarea ${error ? 'textarea-error' : ''} ${className}`}
        style={{ ...style, resize }}
        {...props}
      />
    )
  }
)

Textarea.displayName = 'Textarea'
