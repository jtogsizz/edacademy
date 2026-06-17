'use client'

/**
 * AgendaCardList
 * Client Component que mantém a lista de aulas em estado local.
 *
 * Quando AdminCancellationControls confirma sucesso, o card é marcado
 * localmente como cancelado via callback onSuccess — sem esperar reload total.
 * O router.refresh() do AdminCancellationControls já cuida da sincronização
 * com o servidor depois.
 *
 * Duplo-clique: prevenido pelo loading/disabled interno de AdminCancellationControls.
 */

import { useState } from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import AdminCancellationControls from './AdminCancellationControls'
import MeetLinkButton from '@/components/MeetLinkButton'

interface AgendaItem {
  id: string
  start_time: string
  end_time: string
  status: string
  is_recurring: boolean
  teacher_id: string
  teacher: { id: string; full_name: string; meet_url?: string | null } | null
  student: { id: string; full_name: string; whatsapp_number?: string | null } | null
}

interface Props {
  items: AgendaItem[]
  userTz: string
  isFallback: boolean
  isManager: boolean
}

export default function AgendaCardList({ items: initialItems, userTz, isFallback, isManager }: Props) {
  const [items, setItems] = useState<AgendaItem[]>(initialItems)

  function handleCancelled(aptId?: string) {
    if (!aptId) return
    setItems(prev =>
      prev.map(item =>
        item.id === aptId ? { ...item, status: 'cancelled' } : item
      )
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {items.length > 0 ? (
        items.map((apt) => {
          const start = new Date(apt.start_time)
          const end = new Date(apt.end_time)
          const now = new Date()

          const earlyEntry = new Date(start.getTime() - 10 * 60 * 1000)
          const canEnter = now >= earlyEntry && now <= end
          const isOngoing = now >= start && now <= end
          const student = apt.student

          const displayStart = new Date(start.getTime() + 10 * 60 * 1000)
          const isCancelled = apt.status === 'cancelled'

          return (
            <div
              key={apt.id}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderLeft: isCancelled ? '4px solid #9CA3AF' : `4px solid ${apt.is_recurring ? 'var(--primary)' : '#F59E0B'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1.25rem',
                opacity: isCancelled ? 0.55 : 1,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                transition: 'box-shadow 0.2s, opacity 0.3s',
              }}
            >
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <div style={{ textAlign: 'center', minWidth: '80px', borderRight: '1px solid var(--border)', paddingRight: '1.5rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {formatInTimeZone(start, userTz, 'EEE', { locale: ptBR })}
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: isCancelled ? 'var(--text-muted)' : 'var(--primary)' }}>
                    {formatInTimeZone(start, userTz, 'dd/MM')}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: isCancelled ? 'var(--error)' : (apt.is_recurring ? 'var(--primary)' : '#CA8A04'), textTransform: 'uppercase', marginBottom: '0.2rem', letterSpacing: '0.05em' }}>
                    {isCancelled ? '● CANCELADA / REMARCADA' : (apt.is_recurring ? 'Aula Fixa' : 'Extra / Reposição')}
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.2rem', textDecoration: isCancelled ? 'line-through' : 'none' }}>
                    <>{formatInTimeZone(displayStart, userTz, 'HH:mm')} - {formatInTimeZone(end, userTz, 'HH:mm')}</>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '6px', fontWeight: 'normal' }}>
                      {!isFallback ? '(seu fuso)' : '(padrão BR)'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{student?.full_name}</span>
                    {student?.whatsapp_number && (
                      <a
                        href={`https://wa.me/${student.whatsapp_number.replace(/\D/g, '')}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ color: 'var(--success)', display: 'flex', opacity: 0.8 }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      </a>
                    )}
                  </div>
                  {isManager && apt.teacher?.full_name && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Professor: {apt.teacher.full_name}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Ações Administrativas</div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {isCancelled ? (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, padding: '0.6rem 1.2rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>Indisponível</span>
                    ) : (
                      <>
                        <AdminCancellationControls
                          appointmentId={apt.id}
                          type="single"
                          onSuccess={handleCancelled}
                        />
                        <MeetLinkButton
                          url={apt.teacher?.meet_url}
                          label={isOngoing ? 'Entrar Agora' : canEnter ? 'Sala aberta' : 'Em breve'}
                          emptyMessage="Link do Meet não configurado para este professor."
                          canEnter={canEnter}
                          isOngoing={isOngoing}
                          className="btn-primary"
                          style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })
      ) : (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)', border: '1.5px dashed var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📅</div>
          <h3 style={{ marginBottom: '0.4rem', color: 'var(--text-main)', fontWeight: 700 }}>Sem aulas agendadas</h3>
          <p style={{ fontSize: '0.875rem' }}>Nenhuma aula encontrada para o período selecionado.</p>
        </div>
      )}
    </div>
  )
}
