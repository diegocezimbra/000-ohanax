import React, { HTMLAttributes } from 'react'
import './StatCard.css'

export interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  value: string | number
  icon?: React.ReactNode
  change?: {
    value: number
    label?: string
  }
  trend?: 'up' | 'down' | 'neutral'
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  change,
  trend,
  className = '',
  ...props
}) => {
  const trendIcon = trend === 'up' ? (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
    </svg>
  ) : trend === 'down' ? (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
    </svg>
  ) : null

  return (
    <div className={`stat-card ${className}`} {...props}>
      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        {icon && <span className="stat-card-icon">{icon}</span>}
      </div>
      <div className="stat-card-value">{value}</div>
      {change && (
        <div className={`stat-card-change stat-card-change-${trend || 'neutral'}`}>
          {trendIcon && <span className="stat-card-trend-icon">{trendIcon}</span>}
          <span className="stat-card-change-value">
            {change.value > 0 ? '+' : ''}{change.value}%
          </span>
          {change.label && <span className="stat-card-change-label">{change.label}</span>}
        </div>
      )}
    </div>
  )
}
