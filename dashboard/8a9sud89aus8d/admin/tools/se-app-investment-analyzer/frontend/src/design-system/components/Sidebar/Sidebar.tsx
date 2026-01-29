import React, { HTMLAttributes, createContext, useContext, useState } from 'react'
import './Sidebar.css'

// Sidebar Context for mobile toggle
interface SidebarContextType {
  isOpen: boolean
  toggle: () => void
  close: () => void
}

const SidebarContext = createContext<SidebarContextType>({
  isOpen: false,
  toggle: () => {},
  close: () => {},
})

export const useSidebar = () => useContext(SidebarContext)

export interface SidebarProviderProps {
  children: React.ReactNode
}

export const SidebarProvider: React.FC<SidebarProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false)

  const toggle = () => setIsOpen(prev => !prev)
  const close = () => setIsOpen(false)

  return (
    <SidebarContext.Provider value={{ isOpen, toggle, close }}>
      {children}
    </SidebarContext.Provider>
  )
}

// Mobile Header with hamburger menu
export interface MobileHeaderProps extends HTMLAttributes<HTMLElement> {
  logo?: React.ReactNode
  title?: string
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  logo,
  title,
  className = '',
  ...props
}) => {
  const { toggle } = useSidebar()

  return (
    <header className={`mobile-header ${className}`} {...props}>
      <button className="mobile-menu-btn" onClick={toggle} aria-label="Toggle menu">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      {logo && <div className="mobile-header-logo">{logo}</div>}
      {title && <span className="mobile-header-title">{title}</span>}
    </header>
  )
}

export interface SidebarProps extends HTMLAttributes<HTMLElement> {
  collapsed?: boolean
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed = false,
  children,
  className = '',
  ...props
}) => {
  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${className}`} {...props}>
      {children}
    </aside>
  )
}

export interface SidebarHeaderProps extends HTMLAttributes<HTMLDivElement> {
  logo?: React.ReactNode
  title?: string
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  logo,
  title,
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`sidebar-header ${className}`} {...props}>
      {logo && <div className="sidebar-logo">{logo}</div>}
      {title && <span className="sidebar-title">{title}</span>}
      {children}
    </div>
  )
}

export interface SidebarNavProps extends HTMLAttributes<HTMLElement> {}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <nav className={`sidebar-nav ${className}`} {...props}>
      {children}
    </nav>
  )
}

export interface NavItemProps extends HTMLAttributes<HTMLAnchorElement> {
  href?: string
  icon?: React.ReactNode
  active?: boolean
  badge?: React.ReactNode
  as?: React.ElementType
}

export const NavItem: React.FC<NavItemProps> = ({
  href,
  icon,
  active = false,
  badge,
  children,
  className = '',
  as: Component = 'a',
  ...props
}) => {
  return (
    <Component
      href={href}
      className={`nav-item ${active ? 'active' : ''} ${className}`}
      {...props}
    >
      {icon && <span className="nav-item-icon">{icon}</span>}
      <span className="nav-item-text">{children}</span>
      {badge && <span className="nav-item-badge">{badge}</span>}
    </Component>
  )
}

// Logout Icon (arrow pointing right with bracket |→)
const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16,17 21,12 16,7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

export interface SidebarFooterProps extends HTMLAttributes<HTMLDivElement> {
  onLogout?: () => void
}

export const SidebarFooter: React.FC<SidebarFooterProps> = ({
  onLogout,
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`sidebar-footer ${className}`} {...props}>
      {children}
      {onLogout && (
        <button className="logout-button" onClick={onLogout}>
          <LogoutIcon />
          <span className="logout-text">Sair</span>
        </button>
      )}
    </div>
  )
}

export interface UserProfileProps extends HTMLAttributes<HTMLDivElement> {
  name: string
  email?: string
  avatar?: React.ReactNode
}

export const UserProfile: React.FC<UserProfileProps> = ({
  name,
  email,
  avatar,
  className = '',
  ...props
}) => {
  return (
    <div className={`user-profile ${className}`} {...props}>
      {avatar && <div className="user-avatar">{avatar}</div>}
      <div className="user-info">
        <span className="user-name">{name}</span>
        {email && <span className="user-email">{email}</span>}
      </div>
    </div>
  )
}

export interface LogoutButtonProps extends HTMLAttributes<HTMLButtonElement> {
  onLogout: () => void
}

export const LogoutButton: React.FC<LogoutButtonProps> = ({
  onLogout,
  className = '',
  ...props
}) => {
  return (
    <button
      className={`logout-button ${className}`}
      onClick={onLogout}
      {...props}
    >
      <LogoutIcon />
      <span className="logout-text">Sair</span>
    </button>
  )
}

export interface SidebarUserSectionProps extends HTMLAttributes<HTMLDivElement> {
  name: string
  email?: string
  avatar?: React.ReactNode
}

export const SidebarUserSection: React.FC<SidebarUserSectionProps> = ({
  name,
  email,
  avatar,
  children,
  className = '',
  ...props
}) => {
  // Generate initials from name for avatar fallback
  const initials = name
    ? name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U'

  return (
    <div className={`sidebar-user-section ${className}`} {...props}>
      <div className="user-section-info">
        <div className="user-section-avatar">
          {avatar || initials}
        </div>
        <div className="user-section-details">
          <span className="user-section-name">{name}</span>
          {email && <span className="user-section-email">{email}</span>}
        </div>
      </div>
      {children && (
        <div className="user-section-actions">
          {children}
        </div>
      )}
    </div>
  )
}
