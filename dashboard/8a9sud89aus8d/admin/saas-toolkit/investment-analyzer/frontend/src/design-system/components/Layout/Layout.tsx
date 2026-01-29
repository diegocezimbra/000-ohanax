import React, { HTMLAttributes } from 'react'
import './Layout.css'

export interface LayoutProps extends HTMLAttributes<HTMLDivElement> {}

export const Layout: React.FC<LayoutProps> = ({ children, className = '', ...props }) => {
  return (
    <div className={`layout ${className}`} {...props}>
      {children}
    </div>
  )
}

export interface PageProps extends HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  actions?: React.ReactNode
}

export const Page: React.FC<PageProps> = ({
  title,
  description,
  actions,
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`page ${className}`} {...props}>
      {(title || actions) && (
        <div className="page-header">
          <div className="page-header-content">
            {title && <h1 className="page-title">{title}</h1>}
            {description && <p className="page-description">{description}</p>}
          </div>
          {actions && <div className="page-actions">{actions}</div>}
        </div>
      )}
      <div className="page-content">{children}</div>
    </div>
  )
}

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

export const Container: React.FC<ContainerProps> = ({
  size = 'lg',
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`container container-${size} ${className}`} {...props}>
      {children}
    </div>
  )
}

export interface MainContentProps extends HTMLAttributes<HTMLDivElement> {}

export const MainContent: React.FC<MainContentProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <main className={`main-content ${className}`} {...props}>
      {children}
    </main>
  )
}
