import React from 'react'
import './Text.css'

export type TextVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'body-sm' | 'caption' | 'label'

export interface TextProps {
  variant?: TextVariant
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  as?: keyof JSX.IntrinsicElements
  color?: 'default' | 'muted' | 'primary' | 'success' | 'warning' | 'danger'
  weight?: 'normal' | 'medium' | 'semibold' | 'bold'
  align?: 'left' | 'center' | 'right'
}

const variantToTag: Record<TextVariant, keyof JSX.IntrinsicElements> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  body: 'p',
  'body-sm': 'p',
  caption: 'span',
  label: 'label',
}

export function Text({
  variant = 'body',
  children,
  className = '',
  style,
  as,
  color = 'default',
  weight,
  align,
}: TextProps) {
  const Tag = as || variantToTag[variant]

  const classes = [
    'ds-text',
    `ds-text--${variant}`,
    color !== 'default' && `ds-text--${color}`,
    weight && `ds-text--${weight}`,
    align && `ds-text--${align}`,
    className,
  ].filter(Boolean).join(' ')

  return (
    <Tag className={classes} style={style}>
      {children}
    </Tag>
  )
}
