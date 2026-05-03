'use client'

import { useState, useTransition } from 'react'
import { joinEvent, joinEventOverridingConflict } from '@/app/actions/events'

interface Props {
  eventId: string
  isParticipating: boolean
  isFull: boolean
  isAlmostFull: boolean
  participantCount: number
  maxParticipants: number
}

export default function JoinEventButton({
  eventId, isParticipating, isFull, isAlmostFull, participantCount, maxParticipants
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [conflictData, setConflictData] = useState<any | null>(null)

  const handleJoin = () => {
    setError(null)
    startTransition(async () => {
      const res = await joinEvent(eventId)
      if (res.conflict) {
        setConflictData(res)
      } else if (res.error) {
        setError(res.error)
      }
    })
  }

  const handleOverride = () => {
    if (!conflictData?.conflictId) return
    setError(null)
    startTransition(async () => {
      const res = await joinEventOverridingConflict(eventId, conflictData.conflictId)
      if (res.error) setError(res.error)
      else setConflictData(null)
    })
  }

  // ── Estado: já participa ─────────────────────────────────
  if (isParticipating) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
        padding: '0.85rem', borderRadius: '14px', fontWeight: 700, fontSize: '0.9rem',
        backgroundColor: 'rgba(16,185,129,0.12)', color: '#059669',
        border: '1px solid rgba(16,185,129,0.3)'
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Você já participa deste evento
      </div>
    )
  }

  // ── Estado: lotado ──────────────────────────────────────
  if (isFull) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
        padding: '0.85rem', borderRadius: '14px', fontWeight: 700, fontSize: '0.9rem',
        backgroundColor: 'rgba(239,68,68,0.08)', color: '#dc2626',
        border: '1px solid rgba(239,68,68,0.2)', cursor: 'not-allowed'
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
        </svg>
        Lotado ({participantCount}/{maxParticipants})
      </div>
    )
  }

  // ── Modal de Conflito ────────────────────────────────────
  if (conflictData) {
    return (
      <div style={{
        backgroundColor: 'rgba(234,179,8,0.06)', borderRadius: '16px',
        border: '1px solid rgba(234,179,8,0.3)', padding: '1.25rem',
        display: 'flex', flexDirection: 'column', gap: '1rem'
      }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <div style={{ fontSize: '1.4rem', flexShrink: 0 }}></div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
              Você tem uma aula neste horário
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {conflictData.conflictType === 'appointment'
                ? `Appointment com Prof. ${conflictData.conflictTeacher || 'seu professor'}`
                : `Aula fixa com Prof. ${conflictData.conflictTeacher || 'seu professor'}`
              }
              {conflictData.conflictType === 'appointment' && (
                <span> — ela será cancelada e você receberá <strong>+1 crédito de reposição</strong>.</span>
              )}
              {conflictData.conflictType === 'recurring' && (
                <span> — não é possível cancelar aulas fixas automaticamente. <br/>Entre em contato com seu professor para remarcar.</span>
              )}
            </div>
          </div>
        </div>

        {conflictData.conflictType === 'appointment' && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setConflictData(null)}
              disabled={isPending}
              style={{
                flex: 1, padding: '0.7rem', borderRadius: '12px', fontWeight: 600,
                fontSize: '0.85rem', border: '1px solid var(--border)', cursor: 'pointer',
                backgroundColor: 'var(--bg-main)', color: 'var(--text-main)'
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleOverride}
              disabled={isPending}
              style={{
                flex: 2, padding: '0.7rem', borderRadius: '12px', fontWeight: 700,
                fontSize: '0.85rem', border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff',
                opacity: isPending ? 0.7 : 1
              }}
            >
              {isPending ? 'Processando...' : 'Remarcar e Participar do Evento'}
            </button>
          </div>
        )}

        {conflictData.conflictType === 'recurring' && (
          <button
            onClick={() => setConflictData(null)}
            style={{
              padding: '0.7rem', borderRadius: '12px', fontWeight: 600, fontSize: '0.85rem',
              border: '1px solid var(--border)', cursor: 'pointer',
              backgroundColor: 'var(--bg-main)', color: 'var(--text-main)'
            }}
          >
            Entendi
          </button>
        )}
      </div>
    )
  }

  // ── Botão Participar ─────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {error && (
        <div style={{ fontSize: '0.82rem', color: 'var(--error)', textAlign: 'center' }}>{error}</div>
      )}
      <button
        onClick={handleJoin}
        disabled={isPending}
        style={{
          width: '100%', padding: '0.9rem', borderRadius: '14px',
          fontWeight: 700, fontSize: '0.95rem', border: 'none', cursor: 'pointer',
          background: isAlmostFull
            ? 'linear-gradient(135deg, #f59e0b, #d97706)'
            : 'linear-gradient(135deg, var(--primary), var(--primary-hover, #7c3aed))',
          color: '#fff',
          boxShadow: isAlmostFull
            ? '0 4px 14px rgba(245,158,11,0.35)'
            : '0 4px 14px rgba(var(--primary-rgb,124,58,237),0.35)',
          opacity: isPending ? 0.7 : 1,
          transition: 'all 0.2s ease',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem'
        }}
      >
        {isPending ? (
          'Confirmando...'
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Participar do Evento
          </>
        )}
      </button>
    </div>
  )
}
