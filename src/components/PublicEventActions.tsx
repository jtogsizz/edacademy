'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { joinEvent } from '@/app/actions/events'

interface PublicEventActionsProps {
  eventId: string
  isLogged: boolean
  isParticipating: boolean
  maxParticipants: number
  participantCount: number
}

export default function PublicEventActions({
  eventId,
  isLogged,
  isParticipating,
  maxParticipants,
  participantCount
}: PublicEventActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const isFull = participantCount >= maxParticipants

  const handleParticipate = async () => {
    if (!isLogged) {
      // Redireciona para o cadastro com o ID do evento
      router.push(`/register?event_id=${eventId}`)
      return
    }

    if (isParticipating || isFull) return

    setError(null)
    startTransition(async () => {
      const res = await joinEvent(eventId)
      if (res?.error) {
        setError(res.error)
      } else {
        setSuccess(true)
      }
    })
  }

  if (success || isParticipating) {
    return (
      <div style={{ 
        width: '100%', 
        padding: '1.25rem', 
        backgroundColor: '#F9FAFB', 
        color: '#059669', 
        borderRadius: '99px', 
        textAlign: 'center', 
        fontSize: '1rem', 
        fontWeight: 800,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        border: '1px solid #E5E7EB'
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        Presença Confirmada!
      </div>
    )
  }

  return (
    <div style={{ width: '100%' }}>
      <button
        onClick={handleParticipate}
        disabled={isPending || isFull}
        className={`btn-primary ${isFull ? 'disabled' : ''}`}
        style={{ 
          width: '100%', 
          padding: '1.25rem', 
          fontSize: '1.1rem', 
          fontWeight: 800, 
          borderRadius: '99px',
          cursor: isFull ? 'not-allowed' : 'pointer',
          opacity: isFull ? 0.6 : 1,
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          boxShadow: isFull ? 'none' : '0 15px 30px rgba(234, 88, 12, 0.2)'
        }}
      >
        {isPending ? (
          'Processando...'
        ) : isFull ? (
          'Vagas Esgotadas'
        ) : (
          <>
            Participar agora
            <span style={{ fontSize: '1.2rem' }}>→</span>
          </>
        )}
      </button>
      
      {error && (
        <p style={{ color: 'var(--error)', fontSize: '0.85rem', textAlign: 'center', marginTop: '0.5rem', fontWeight: 500 }}>
          {error}
        </p>
      )}

      {!isLogged && !isFull && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', marginTop: '0.8rem' }}>
          Você será redirecionado para criar sua conta gratuita.
        </p>
      )}
    </div>
  )
}
