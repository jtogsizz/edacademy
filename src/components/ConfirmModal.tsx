'use client'

import { useEffect, useRef } from 'react'

export interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  cancelLabel: string
  confirmLabel: string
  /** 'primary' → botão azul/laranja (padrão). 'danger' → botão vermelho. */
  confirmVariant?: 'primary' | 'danger'
  onCancel: () => void
  onConfirm: () => void
  /** Texto de erro a exibir dentro do modal (ex: resposta de server action) */
  errorMessage?: string | null
  isLoading?: boolean
}

/**
 * Modal de confirmação reutilizável.
 * - Dark mode via CSS vars do sistema
 * - Mobile-friendly (90vw, scroll interno se necessário)
 * - Sem emojis
 * - Textos passados via props (compatível com i18n)
 * - Fecha ao clicar no overlay ou pressionar Escape
 */
export default function ConfirmModal({
  isOpen,
  title,
  message,
  cancelLabel,
  confirmLabel,
  confirmVariant = 'primary',
  onCancel,
  onConfirm,
  errorMessage,
  isLoading = false,
}: ConfirmModalProps) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null)

  // Foca no botão de confirmação ao abrir
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => confirmBtnRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Fecha com Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onCancel])

  // Trava o scroll do body enquanto o modal está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  const confirmStyle: React.CSSProperties =
    confirmVariant === 'danger'
      ? {
          background: 'var(--error)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1.25rem',
          fontWeight: 700,
          fontSize: '0.875rem',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.7 : 1,
          transition: 'opacity 0.15s',
          minWidth: '140px',
        }
      : {
          background: 'var(--primary-gradient)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1.25rem',
          fontWeight: 700,
          fontSize: '0.875rem',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.7 : 1,
          transition: 'opacity 0.15s',
          minWidth: '140px',
        }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        // Fecha ao clicar no overlay (fora do card)
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        className="animate-fade-in"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.35)',
          width: '90%',
          maxWidth: '420px',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {/* Título */}
        <h2
          id="confirm-modal-title"
          style={{
            margin: 0,
            fontSize: '1.1rem',
            fontWeight: 700,
            color: 'var(--text-main)',
            lineHeight: 1.3,
          }}
        >
          {title}
        </h2>

        {/* Mensagem */}
        <p
          style={{
            margin: 0,
            fontSize: '0.9rem',
            color: 'var(--text-muted)',
            lineHeight: 1.6,
          }}
        >
          {message}
        </p>

        {/* Erro (se houver) */}
        {errorMessage && (
          <div
            role="alert"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--error)',
              borderRadius: 'var(--radius-md)',
              padding: '0.65rem 0.85rem',
              fontSize: '0.82rem',
              color: 'var(--error)',
              fontWeight: 500,
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* Botões */}
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
            marginTop: '0.25rem',
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1.25rem',
              fontWeight: 600,
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s, color 0.15s',
              minWidth: '90px',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = 'var(--bg-hover)'
                e.currentTarget.style.color = 'var(--text-main)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            {cancelLabel}
          </button>

          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            style={confirmStyle}
          >
            {isLoading ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
