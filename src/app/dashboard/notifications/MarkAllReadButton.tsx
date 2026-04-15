'use client'

import { useTransition } from 'react'
import { markAllNotificationsAsRead } from './actions'

export default function MarkAllReadButton({ disabled }: { disabled?: boolean }) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      disabled={disabled || isPending}
      onClick={() => startTransition(() => { void markAllNotificationsAsRead() })}
      style={{
        padding: '0.5rem 1.25rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        backgroundColor: 'var(--bg-card)',
        color: 'var(--text-muted)',
        fontSize: '0.82rem',
        fontWeight: 600,
        cursor: disabled || isPending ? 'not-allowed' : 'pointer',
        opacity: disabled || isPending ? 0.5 : 1,
        transition: 'all 0.2s',
      }}
    >
      {isPending ? 'Marcando...' : '✓ Marcar tudo como lido'}
    </button>
  )
}
