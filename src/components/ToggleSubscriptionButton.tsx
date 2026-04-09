"use client"

import { useState } from 'react'
import { toggleSubscriptionStatus } from '@/app/admin/actions'

interface Props {
  studentId: string
  currentStatus: string
  isActive: boolean
}

export default function ToggleSubscriptionButton({ studentId, currentStatus, isActive }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    setError(null)
    const result = await toggleSubscriptionStatus(studentId, currentStatus)
    if (result && 'error' in result) {
      setError(result.error)
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="btn-outline"
        style={{
          fontSize: '0.8rem',
          padding: '0.4rem 0.8rem',
          color: isActive ? 'var(--error)' : 'var(--success)',
          borderColor: isActive ? 'var(--error)' : 'var(--success)',
          opacity: loading ? 0.6 : 1,
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? '...' : isActive ? 'Bloquear Acesso' : 'Liberar Acesso'}
      </button>
      {error && (
        <span style={{
          fontSize: '0.72rem',
          color: 'var(--error)',
          maxWidth: '180px',
          textAlign: 'right',
          lineHeight: 1.3
        }}>
          ⚠ {error}
        </span>
      )}
    </div>
  )
}
