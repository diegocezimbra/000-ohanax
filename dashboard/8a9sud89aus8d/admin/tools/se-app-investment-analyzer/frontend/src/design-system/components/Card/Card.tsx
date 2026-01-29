/**
 * ==============================================================================
 * Card Component - Componente de Card
 * ==============================================================================
 *
 * Container com sombra e padding para agrupar conteúdo.
 *
 * ## Subcomponentes
 *
 * | Componente  | Descrição                                   |
 * |-------------|---------------------------------------------|
 * | Card        | Container principal                         |
 * | CardHeader  | Cabeçalho com título, descrição e action    |
 * | CardContent | Área de conteúdo                            |
 * | CardFooter  | Rodapé (ações, botões)                      |
 *
 * ## Variantes
 *
 * - default: Background sólido
 * - bordered: Com borda
 * - elevated: Com sombra elevada
 *
 * @example
 * <Card>
 *   <CardHeader
 *     title="Meu Card"
 *     description="Descrição opcional"
 *     action={<Button size="sm">Ação</Button>}
 *   />
 *   <CardContent>
 *     Conteúdo aqui
 *   </CardContent>
 *   <CardFooter>
 *     <Button>Salvar</Button>
 *   </CardFooter>
 * </Card>
 *
 * @module design-system/components
 */
import React, { HTMLAttributes } from 'react'
import './Card.css'

/** Props do componente Card */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  ...props
}) => {
  const classes = [
    'card',
    `card-${variant}`,
    `card-padding-${padding}`,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  )
}

export interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  description,
  action,
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`card-header ${className}`} {...props}>
      {(title || description) && (
        <div className="card-header-content">
          {title && <h3 className="card-title">{title}</h3>}
          {description && <p className="card-description">{description}</p>}
        </div>
      )}
      {action && <div className="card-header-action">{action}</div>}
      {children}
    </div>
  )
}

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

export const CardContent: React.FC<CardContentProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`card-content ${className}`} {...props}>
      {children}
    </div>
  )
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`card-footer ${className}`} {...props}>
      {children}
    </div>
  )
}
