import { Theme, ThemeConfig } from '../types/theme'
import { darkenColor, addAlpha } from './colors'

/**
 * Default dark theme (Stripe-inspired)
 */
export const darkTheme: Theme = {
  name: 'dark',
  mode: 'dark',
  colors: {
    primary: '#6366f1',
    primaryHover: '#4f46e5',
    primaryLight: 'rgba(99, 102, 241, 0.15)',

    success: '#22c55e',
    successHover: '#16a34a',
    successLight: 'rgba(34, 197, 94, 0.15)',

    warning: '#f59e0b',
    warningHover: '#d97706',
    warningLight: 'rgba(245, 158, 11, 0.15)',

    danger: '#ef4444',
    dangerHover: '#dc2626',
    dangerLight: 'rgba(239, 68, 68, 0.15)',

    info: '#3b82f6',
    infoHover: '#2563eb',
    infoLight: 'rgba(59, 130, 246, 0.15)',
  },
  background: {
    primary: '#0f172a',
    secondary: '#1e293b',
    tertiary: '#334155',
    elevated: '#1e293b',
  },
  text: {
    primary: '#f8fafc',
    secondary: '#94a3b8',
    muted: '#64748b',
    inverse: '#0f172a',
  },
  border: {
    color: '#334155',
    colorLight: '#475569',
    radius: '8px',
    radiusSm: '4px',
    radiusLg: '12px',
    radiusFull: '9999px',
  },
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
  },
}

/**
 * Default light theme
 */
export const lightTheme: Theme = {
  name: 'light',
  mode: 'light',
  colors: {
    primary: '#6366f1',
    primaryHover: '#4f46e5',
    primaryLight: 'rgba(99, 102, 241, 0.1)',

    success: '#22c55e',
    successHover: '#16a34a',
    successLight: 'rgba(34, 197, 94, 0.1)',

    warning: '#f59e0b',
    warningHover: '#d97706',
    warningLight: 'rgba(245, 158, 11, 0.1)',

    danger: '#ef4444',
    dangerHover: '#dc2626',
    dangerLight: 'rgba(239, 68, 68, 0.1)',

    info: '#3b82f6',
    infoHover: '#2563eb',
    infoLight: 'rgba(59, 130, 246, 0.1)',
  },
  background: {
    primary: '#ffffff',
    secondary: '#f8fafc',
    tertiary: '#f1f5f9',
    elevated: '#ffffff',
  },
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    muted: '#94a3b8',
    inverse: '#ffffff',
  },
  border: {
    color: '#e2e8f0',
    colorLight: '#f1f5f9',
    radius: '8px',
    radiusSm: '4px',
    radiusLg: '12px',
    radiusFull: '9999px',
  },
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
  },
}

/**
 * Create a custom theme from config
 */
export function createTheme(config: ThemeConfig = {}): Theme {
  const baseTheme = config.mode === 'light' ? lightTheme : darkTheme
  const primaryColor = config.primaryColor || baseTheme.colors.primary

  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: primaryColor,
      primaryHover: darkenColor(primaryColor, 15),
      primaryLight: addAlpha(primaryColor, baseTheme.mode === 'dark' ? 0.15 : 0.1),
    },
    border: {
      ...baseTheme.border,
      radius: config.borderRadius || baseTheme.border.radius,
      radiusSm: config.borderRadius ? `calc(${config.borderRadius} / 2)` : baseTheme.border.radiusSm,
      radiusLg: config.borderRadius ? `calc(${config.borderRadius} * 1.5)` : baseTheme.border.radiusLg,
    },
  }
}

/**
 * Apply theme to document root as CSS variables
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement

  // Colors
  root.style.setProperty('--color-primary', theme.colors.primary)
  root.style.setProperty('--color-primary-hover', theme.colors.primaryHover)
  root.style.setProperty('--color-primary-light', theme.colors.primaryLight)

  root.style.setProperty('--color-success', theme.colors.success)
  root.style.setProperty('--color-success-hover', theme.colors.successHover)
  root.style.setProperty('--color-success-light', theme.colors.successLight)

  root.style.setProperty('--color-warning', theme.colors.warning)
  root.style.setProperty('--color-warning-hover', theme.colors.warningHover)
  root.style.setProperty('--color-warning-light', theme.colors.warningLight)

  root.style.setProperty('--color-danger', theme.colors.danger)
  root.style.setProperty('--color-danger-hover', theme.colors.dangerHover)
  root.style.setProperty('--color-danger-light', theme.colors.dangerLight)

  root.style.setProperty('--color-info', theme.colors.info)
  root.style.setProperty('--color-info-hover', theme.colors.infoHover)
  root.style.setProperty('--color-info-light', theme.colors.infoLight)

  // Background
  root.style.setProperty('--bg-primary', theme.background.primary)
  root.style.setProperty('--bg-secondary', theme.background.secondary)
  root.style.setProperty('--bg-tertiary', theme.background.tertiary)
  root.style.setProperty('--bg-elevated', theme.background.elevated)

  // Text
  root.style.setProperty('--text-primary', theme.text.primary)
  root.style.setProperty('--text-secondary', theme.text.secondary)
  root.style.setProperty('--text-muted', theme.text.muted)
  root.style.setProperty('--text-inverse', theme.text.inverse)

  // Border
  root.style.setProperty('--border-color', theme.border.color)
  root.style.setProperty('--border-color-light', theme.border.colorLight)
  root.style.setProperty('--radius', theme.border.radius)
  root.style.setProperty('--radius-sm', theme.border.radiusSm)
  root.style.setProperty('--radius-lg', theme.border.radiusLg)
  root.style.setProperty('--radius-full', theme.border.radiusFull)

  // Shadow
  root.style.setProperty('--shadow-sm', theme.shadow.sm)
  root.style.setProperty('--shadow-md', theme.shadow.md)
  root.style.setProperty('--shadow-lg', theme.shadow.lg)
  root.style.setProperty('--shadow-xl', theme.shadow.xl)

  // Spacing
  root.style.setProperty('--space-xs', theme.spacing.xs)
  root.style.setProperty('--space-sm', theme.spacing.sm)
  root.style.setProperty('--space-md', theme.spacing.md)
  root.style.setProperty('--space-lg', theme.spacing.lg)
  root.style.setProperty('--space-xl', theme.spacing.xl)
  root.style.setProperty('--space-2xl', theme.spacing['2xl'])

  // Set theme mode attribute for CSS selectors
  root.setAttribute('data-theme', theme.mode)
}

/**
 * Get CSS variables string for SSR or style injection
 */
export function getThemeCssVariables(theme: Theme): string {
  return `
    :root {
      --color-primary: ${theme.colors.primary};
      --color-primary-hover: ${theme.colors.primaryHover};
      --color-primary-light: ${theme.colors.primaryLight};

      --color-success: ${theme.colors.success};
      --color-success-hover: ${theme.colors.successHover};
      --color-success-light: ${theme.colors.successLight};

      --color-warning: ${theme.colors.warning};
      --color-warning-hover: ${theme.colors.warningHover};
      --color-warning-light: ${theme.colors.warningLight};

      --color-danger: ${theme.colors.danger};
      --color-danger-hover: ${theme.colors.dangerHover};
      --color-danger-light: ${theme.colors.dangerLight};

      --color-info: ${theme.colors.info};
      --color-info-hover: ${theme.colors.infoHover};
      --color-info-light: ${theme.colors.infoLight};

      --bg-primary: ${theme.background.primary};
      --bg-secondary: ${theme.background.secondary};
      --bg-tertiary: ${theme.background.tertiary};
      --bg-elevated: ${theme.background.elevated};

      --text-primary: ${theme.text.primary};
      --text-secondary: ${theme.text.secondary};
      --text-muted: ${theme.text.muted};
      --text-inverse: ${theme.text.inverse};

      --border-color: ${theme.border.color};
      --border-color-light: ${theme.border.colorLight};
      --radius: ${theme.border.radius};
      --radius-sm: ${theme.border.radiusSm};
      --radius-lg: ${theme.border.radiusLg};
      --radius-full: ${theme.border.radiusFull};

      --shadow-sm: ${theme.shadow.sm};
      --shadow-md: ${theme.shadow.md};
      --shadow-lg: ${theme.shadow.lg};
      --shadow-xl: ${theme.shadow.xl};

      --space-xs: ${theme.spacing.xs};
      --space-sm: ${theme.spacing.sm};
      --space-md: ${theme.spacing.md};
      --space-lg: ${theme.spacing.lg};
      --space-xl: ${theme.spacing.xl};
      --space-2xl: ${theme.spacing['2xl']};
    }
  `
}
