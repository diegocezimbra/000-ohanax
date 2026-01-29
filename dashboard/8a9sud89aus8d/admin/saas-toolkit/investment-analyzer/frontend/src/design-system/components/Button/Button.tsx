/**
 * ==============================================================================
 * Button Component - Componente de Botão
 * ==============================================================================
 *
 * Botão reutilizável com variantes, tamanhos e estados.
 *
 * ## Variantes
 *
 * | Variant   | Uso                                        |
 * |-----------|--------------------------------------------|
 * | primary   | Ação principal (default)                   |
 * | secondary | Ação secundária                            |
 * | danger    | Ação destrutiva (excluir, cancelar)        |
 * | ghost     | Botão sem background                       |
 * | link      | Estilo de link                             |
 *
 * ## Tamanhos
 *
 * - sm: Pequeno (32px)
 * - md: Médio (40px, default)
 * - lg: Grande (48px)
 *
 * @example
 * <Button variant="primary" onClick={handleClick}>
 *   Salvar
 * </Button>
 *
 * <Button variant="danger" loading>
 *   Excluindo...
 * </Button>
 *
 * <Button leftIcon={<PlusIcon />}>
 *   Adicionar
 * </Button>
 *
 * @module design-system/components
 */
import React, { forwardRef, ButtonHTMLAttributes } from 'react'
import './Button.css'

/** Props do componente Button */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      disabled,
      leftIcon,
      rightIcon,
      className = '',
      ...props
    },
    ref
  ) => {
    const classes = [
      'btn',
      `btn-${variant}`,
      `btn-${size}`,
      fullWidth && 'btn-full',
      loading && 'btn-loading',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span className="btn-spinner" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" opacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
          </span>
        )}
        {!loading && leftIcon && <span className="btn-icon btn-icon-left">{leftIcon}</span>}
        <span className="btn-text">{children}</span>
        {!loading && rightIcon && <span className="btn-icon btn-icon-right">{rightIcon}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'
