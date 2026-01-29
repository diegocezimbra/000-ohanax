export interface ThemeColors {
  primary: string
  primaryHover: string
  primaryLight: string

  success: string
  successHover: string
  successLight: string

  warning: string
  warningHover: string
  warningLight: string

  danger: string
  dangerHover: string
  dangerLight: string

  info: string
  infoHover: string
  infoLight: string
}

export interface ThemeBackground {
  primary: string
  secondary: string
  tertiary: string
  elevated: string
}

export interface ThemeText {
  primary: string
  secondary: string
  muted: string
  inverse: string
}

export interface ThemeBorder {
  color: string
  colorLight: string
  radius: string
  radiusSm: string
  radiusLg: string
  radiusFull: string
}

export interface ThemeShadow {
  sm: string
  md: string
  lg: string
  xl: string
}

export interface ThemeSpacing {
  xs: string
  sm: string
  md: string
  lg: string
  xl: string
  '2xl': string
}

export interface Theme {
  name: string
  mode: 'light' | 'dark'
  colors: ThemeColors
  background: ThemeBackground
  text: ThemeText
  border: ThemeBorder
  shadow: ThemeShadow
  spacing: ThemeSpacing
}

export interface ThemeConfig {
  primaryColor?: string
  mode?: 'light' | 'dark'
  borderRadius?: string
}
