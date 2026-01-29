import React, { HTMLAttributes } from 'react'
import './Loading.css'

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg'
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  className = '',
  ...props
}) => {
  return (
    <div className={`spinner spinner-${size} ${className}`} role="status" {...props}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="10" strokeWidth="3" strokeOpacity="0.25" />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <span className="sr-only">Loading...</span>
    </div>
  )
}

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number
  height?: string | number
  rounded?: boolean
  circle?: boolean
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  rounded = false,
  circle = false,
  className = '',
  style,
  ...props
}) => {
  return (
    <div
      className={`skeleton ${rounded ? 'skeleton-rounded' : ''} ${circle ? 'skeleton-circle' : ''} ${className}`}
      style={{
        width: width,
        height: height,
        ...style,
      }}
      {...props}
    />
  )
}

export interface LoadingOverlayProps extends HTMLAttributes<HTMLDivElement> {
  visible: boolean
  text?: string
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  text,
  className = '',
  ...props
}) => {
  if (!visible) return null

  return (
    <div className={`loading-overlay ${className}`} {...props}>
      <div className="loading-overlay-content">
        <Spinner size="lg" />
        {text && <p className="loading-overlay-text">{text}</p>}
      </div>
    </div>
  )
}

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  variant?: 'default' | 'success' | 'warning' | 'danger'
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  size = 'md',
  showLabel = false,
  variant = 'default',
  className = '',
  ...props
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className={`progress-wrapper ${className}`} {...props}>
      <div
        className={`progress progress-${size} progress-${variant}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className="progress-bar"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="progress-label">{Math.round(percentage)}%</span>
      )}
    </div>
  )
}
