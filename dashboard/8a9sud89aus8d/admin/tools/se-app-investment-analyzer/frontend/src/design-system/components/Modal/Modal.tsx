/**
 * ==============================================================================
 * Modal Component - Componente de Dialog
 * ==============================================================================
 *
 * Dialog modal com overlay, fechamento por ESC e clique fora.
 *
 * ## Subcomponentes
 *
 * | Componente  | Descrição                                   |
 * |-------------|---------------------------------------------|
 * | Modal       | Container com overlay                       |
 * | ModalHeader | Cabeçalho com título e botão fechar         |
 * | ModalBody   | Área de conteúdo scrollável                 |
 * | ModalFooter | Rodapé com ações (botões)                   |
 *
 * ## Tamanhos
 *
 * - sm: 400px
 * - md: 500px (default)
 * - lg: 700px
 * - xl: 900px
 * - full: 100% da tela
 *
 * ## Acessibilidade
 *
 * - role="dialog" e aria-modal="true"
 * - Fecha com ESC (closeOnEscape)
 * - Bloqueia scroll do body quando aberto
 *
 * @example
 * <Modal open={isOpen} onClose={() => setIsOpen(false)}>
 *   <ModalHeader onClose={() => setIsOpen(false)}>
 *     <h2>Título</h2>
 *   </ModalHeader>
 *   <ModalBody>
 *     Conteúdo do modal
 *   </ModalBody>
 *   <ModalFooter>
 *     <Button variant="secondary" onClick={() => setIsOpen(false)}>
 *       Cancelar
 *     </Button>
 *     <Button variant="primary">Confirmar</Button>
 *   </ModalFooter>
 * </Modal>
 *
 * @module design-system/components
 */
import React, { HTMLAttributes, useEffect, useCallback } from 'react'
import './Modal.css'

/** Props do componente Modal */
export interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean
  onClose: () => void
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closeOnOverlay?: boolean
  closeOnEscape?: boolean
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  size = 'md',
  closeOnOverlay = true,
  closeOnEscape = true,
  children,
  className = '',
  ...props
}) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && closeOnEscape) {
      onClose()
    }
  }, [onClose, closeOnEscape])

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={closeOnOverlay ? onClose : undefined}>
      <div
        className={`modal modal-${size} ${className}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        {...props}
      >
        {children}
      </div>
    </div>
  )
}

export interface ModalHeaderProps extends HTMLAttributes<HTMLDivElement> {
  onClose?: () => void
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  onClose,
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`modal-header ${className}`} {...props}>
      <div className="modal-title">{children}</div>
      {onClose && (
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
          </svg>
        </button>
      )}
    </div>
  )
}

export interface ModalBodyProps extends HTMLAttributes<HTMLDivElement> {}

export const ModalBody: React.FC<ModalBodyProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`modal-body ${className}`} {...props}>
      {children}
    </div>
  )
}

export interface ModalFooterProps extends HTMLAttributes<HTMLDivElement> {}

export const ModalFooter: React.FC<ModalFooterProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`modal-footer ${className}`} {...props}>
      {children}
    </div>
  )
}
