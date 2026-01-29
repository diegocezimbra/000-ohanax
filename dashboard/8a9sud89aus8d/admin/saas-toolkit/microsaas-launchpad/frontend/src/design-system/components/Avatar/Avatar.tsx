import React, { HTMLAttributes } from 'react'
import './Avatar.css'

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  name?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  status?: 'online' | 'offline' | 'away' | 'busy'
}

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  name,
  size = 'md',
  status,
  className = '',
  ...props
}) => {
  return (
    <div className={`avatar avatar-${size} ${className}`} {...props}>
      {src ? (
        <img src={src} alt={alt || name} className="avatar-image" />
      ) : name ? (
        <span className="avatar-initials">{getInitials(name)}</span>
      ) : (
        <span className="avatar-fallback">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </span>
      )}
      {status && <span className={`avatar-status avatar-status-${status}`} />}
    </div>
  )
}

export interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  max?: number
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  max = 4,
  children,
  className = '',
  ...props
}) => {
  const childrenArray = React.Children.toArray(children)
  const visibleChildren = childrenArray.slice(0, max)
  const remainingCount = childrenArray.length - max

  return (
    <div className={`avatar-group ${className}`} {...props}>
      {visibleChildren}
      {remainingCount > 0 && (
        <div className="avatar avatar-md avatar-overflow">
          <span className="avatar-initials">+{remainingCount}</span>
        </div>
      )}
    </div>
  )
}
