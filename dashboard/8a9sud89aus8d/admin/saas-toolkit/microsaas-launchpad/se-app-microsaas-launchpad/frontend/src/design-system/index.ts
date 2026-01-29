/**
 * ==============================================================================
 * Design System - Sistema de Componentes UI
 * ==============================================================================
 *
 * Biblioteca de componentes React reutilizáveis para o frontend.
 * Baseado em CSS Variables para theming e consistência visual.
 *
 * ## Categorias de Componentes
 *
 * | Categoria    | Componentes                                    |
 * |--------------|------------------------------------------------|
 * | Base         | Button, Input, Badge, Card, Text               |
 * | Form         | FormGroup, Select, Toggle, Textarea            |
 * | Layout       | Layout, Page, Sidebar                          |
 * | Data         | Table, Pagination, Modal, Tabs                 |
 * | Feedback     | Alert, Toast, EmptyState, Loading, Spinner     |
 * | Additional   | Avatar, Dropdown, SearchInput, StatCard        |
 *
 * ## Uso
 *
 * ```tsx
 * import {
 *   Button,
 *   Card,
 *   CardHeader,
 *   CardContent,
 *   Alert,
 *   Spinner
 * } from '@/design-system'
 * ```
 *
 * ## Estrutura
 *
 * ```
 * design-system/
 * ├── components/     # Componentes React
 * ├── styles/         # CSS base e variáveis
 * ├── types/          # TypeScript types
 * └── utils/          # Utilitários de tema
 * ```
 *
 * @module design-system
 */

// Styles - import this to get base styles
import './styles/base.css'

// Import component styles that may be used via CSS classes only
import './components/Tabs/Tabs.css'

// Export all components
export * from './components'

// Export theme utilities
export * from './utils'

// Export types
export * from './types'
