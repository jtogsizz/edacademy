"use client"

import { useState } from 'react'
import { removeRecurringClass } from '../schedule/actions'
import { useRouter } from 'next/navigation'

export default function RemoveClassButton({ classId }: { classId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleRemove() {
    setLoading(true)
    setError(null)
    
    try {
      const res = await removeRecurringClass(classId)
      if (res?.error) {
        setError(res.error)
      } else {
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao remover.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
      <button 
        onClick={handleRemove} 
        disabled={loading}
        style={{ 
          background: 'none', 
          border: 'none', 
          color: loading ? 'var(--text-muted)' : 'var(--error)', 
          fontSize: '0.8rem', 
          cursor: loading ? 'not-allowed' : 'pointer', 
          padding: '0.5rem',
          textDecoration: 'underline'
        }}
      >
        {loading ? 'Removendo...' : 'Remover'}
      </button>
      
      {error && (
        <div style={{ 
          fontSize: '0.75rem', 
          color: 'var(--error)', 
          maxWidth: '250px', 
          textAlign: 'right',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          padding: '0.5rem',
          borderRadius: '4px',
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}>
          {error}
        </div>
      )}
    </div>
  )
}
