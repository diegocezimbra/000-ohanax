import React, { HTMLAttributes, useState, useRef, useEffect } from 'react'
import './Dropdown.css'

export interface DropdownProps extends HTMLAttributes<HTMLDivElement> {
  trigger: React.ReactNode
  align?: 'left' | 'right'
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  align = 'left',
  children,
  className = '',
  ...props
}) => {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`dropdown ${className}`} ref={dropdownRef} {...props}>
      <div className="dropdown-trigger" onClick={() => setOpen(!open)}>
        {trigger}
      </div>
      {open && (
        <div className={`dropdown-menu dropdown-align-${align}`}>
          {children}
        </div>
      )}
    </div>
  )
}

export interface DropdownItemProps extends HTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode
  danger?: boolean
  disabled?: boolean
}

export const DropdownItem: React.FC<DropdownItemProps> = ({
  icon,
  danger = false,
  disabled = false,
  children,
  className = '',
  onClick,
  ...props
}) => {
  return (
    <button
      className={`dropdown-item ${danger ? 'dropdown-item-danger' : ''} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {icon && <span className="dropdown-item-icon">{icon}</span>}
      <span className="dropdown-item-text">{children}</span>
    </button>
  )
}

export interface DropdownDividerProps extends HTMLAttributes<HTMLDivElement> {}

export const DropdownDivider: React.FC<DropdownDividerProps> = ({
  className = '',
  ...props
}) => {
  return <div className={`dropdown-divider ${className}`} {...props} />
}

export interface DropdownLabelProps extends HTMLAttributes<HTMLDivElement> {}

export const DropdownLabel: React.FC<DropdownLabelProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`dropdown-label ${className}`} {...props}>
      {children}
    </div>
  )
}
