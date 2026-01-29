import React, { HTMLAttributes } from 'react'
import './EmptyState.css'

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

const defaultIcon = (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="6" y="10" width="36" height="28" rx="2" />
    <path d="M6 18h36" />
    <circle cx="12" cy="14" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="17" cy="14" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="22" cy="14" r="1.5" fill="currentColor" stroke="none" />
    <path d="M16 28h16M20 32h8" strokeLinecap="round" />
  </svg>
)

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = defaultIcon,
  title,
  description,
  action,
  className = '',
  ...props
}) => {
  return (
    <div className={`empty-state ${className}`} {...props}>
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  )
}
