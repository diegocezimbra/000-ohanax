/**
 * ==============================================================================
 * Design System Components - Componentes UI
 * ==============================================================================
 *
 * ## Base Components
 *
 * | Componente | Props Principais                              |
 * |------------|-----------------------------------------------|
 * | Button     | variant, size, loading, disabled              |
 * | Input      | type, placeholder, error, disabled            |
 * | Badge      | variant (success, warning, danger, primary)   |
 * | Card       | Com CardHeader e CardContent                  |
 * | Text       | as, size, weight, color                       |
 *
 * ## Form Components
 *
 * | Componente | Descrição                                     |
 * |------------|-----------------------------------------------|
 * | FormGroup  | Label + Input + hint/error wrapper            |
 * | Select     | Dropdown select nativo estilizado             |
 * | Toggle     | Switch on/off                                 |
 * | Textarea   | Input multiline                               |
 *
 * ## Layout Components
 *
 * | Componente | Descrição                                     |
 * |------------|-----------------------------------------------|
 * | Layout     | Container principal com sidebar               |
 * | Page       | Wrapper de página com padding                 |
 * | Sidebar    | Navegação lateral                             |
 *
 * ## Data Components
 *
 * | Componente | Descrição                                     |
 * |------------|-----------------------------------------------|
 * | Table      | Tabela com header e body                      |
 * | Pagination | Navegação de páginas                          |
 * | Modal      | Dialog overlay                                |
 * | Tabs       | Navegação por abas                            |
 *
 * ## Feedback Components
 *
 * | Componente | Descrição                                     |
 * |------------|-----------------------------------------------|
 * | Alert      | Mensagem de alerta (info, warning, danger)    |
 * | Toast      | Notificação temporária                        |
 * | EmptyState | Placeholder para listas vazias                |
 * | Loading    | Indicador de carregamento                     |
 * | Spinner    | Spinner animado                               |
 *
 * @module design-system/components
 */

// Base Components
export * from './Button'
export * from './Input'
export * from './Badge'
export * from './Card'
export * from './Text'

// Form Components
export * from './FormGroup'
export * from './Select'
export * from './Toggle'
export * from './Textarea'

// Layout Components
export * from './Layout'
export * from './Sidebar'

// Data Components
export * from './Table'
export * from './Pagination'
export * from './Modal'
export * from './Tabs'

// Feedback Components
export * from './Alert'
export * from './Toast'
export * from './EmptyState'
export * from './Loading'

// Additional Components
export * from './Avatar'
export * from './Dropdown'
export * from './SearchInput'
export * from './StatCard'
