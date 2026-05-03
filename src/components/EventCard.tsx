'use client'

import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import JoinEventButton from './JoinEventButton'

interface Event {
  id: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  max_participants: number
  status: string
  created_at: string
  teacher: { id: string; full_name: string; avatar_url: string | null }
  participant_count: number
  is_participating: boolean
}

interface Props {
  event: Event
  userTimezone: string
  isStudent: boolean
  isStaff?: boolean
  meetLink?: string
}

export default function EventCard({ event, userTimezone, isStudent, isStaff, meetLink = '#' }: Props) {
  const tz = userTimezone || 'America/Sao_Paulo'
  const start = new Date(event.start_time)
  const end = new Date(event.end_time)
  
  const isFull = event.participant_count >= event.max_participants
  const isAlmostFull = !isFull && event.participant_count >= event.max_participants * 0.8
  const spotsLeft = event.max_participants - event.participant_count
  const fillPercent = Math.min(100, Math.round((event.participant_count / event.max_participants) * 100))

  const now = new Date()
  const earlyEntry = new Date(start.getTime() - 15 * 60 * 1000)
  const canEnter = now >= earlyEntry && now <= end
  const isOngoing = now >= start && now <= end
  const isEnded = now > end
  
  const canSeeEntryButton = (isStudent && event.is_participating) || isStaff

  const dayLabel = formatInTimeZone(start, tz, "EEEE, dd 'de' MMMM", { locale: ptBR })
  const timeLabel = `${formatInTimeZone(start, tz, 'HH:mm')} às ${formatInTimeZone(end, tz, 'HH:mm')}`

  return (
    <article style={{
      borderRadius: '24px',
      overflow: 'hidden',
      border: '1px solid var(--border)',
      backgroundColor: 'var(--bg-card)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      position: 'relative',
    }}>
      {/* ── Faixa superior com gradiente ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(59,130,246,0.08) 100%)',
        padding: '1.25rem 1.5rem 1rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        flexWrap: 'wrap', gap: '0.75rem'
      }}>
        {/* Badge EVENTO AO VIVO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.3rem 0.75rem', borderRadius: '99px', fontSize: '0.7rem',
            fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
            backgroundColor: 'var(--primary)', color: '#fff',
            boxShadow: '0 2px 8px rgba(124,58,237,0.4)'
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', backgroundColor: '#fff',
              animation: 'pulse 1.5s infinite'
            }} />
            Evento
          </span>

          {isFull && (
            <span style={{
              padding: '0.3rem 0.75rem', borderRadius: '99px', fontSize: '0.7rem',
              fontWeight: 700, backgroundColor: 'rgba(239,68,68,0.1)',
              color: '#dc2626', border: '1px solid rgba(239,68,68,0.25)'
            }}>Lotado</span>
          )}
          {isAlmostFull && !isFull && (
            <span style={{
              padding: '0.3rem 0.75rem', borderRadius: '99px', fontSize: '0.7rem',
              fontWeight: 700, backgroundColor: 'rgba(245,158,11,0.1)',
              color: '#d97706', border: '1px solid rgba(245,158,11,0.25)'
            }}>⚡ Últimas Vagas</span>
          )}
          {event.is_participating && (
            <span style={{
              padding: '0.3rem 0.75rem', borderRadius: '99px', fontSize: '0.7rem',
              fontWeight: 700, backgroundColor: 'rgba(16,185,129,0.1)',
              color: '#059669', border: '1px solid rgba(16,185,129,0.25)'
            }}>✓ Você participa</span>
          )}
        </div>
      </div>

      {/* ── Corpo do Card ── */}
      <div style={{ padding: '1.5rem' }}>
        {/* Título */}
        <h3 style={{
          fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.75rem',
          color: 'var(--text-main)', lineHeight: 1.3
        }}>
          {event.title}
        </h3>

        {/* Linha do Professor */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', overflow: 'hidden',
            backgroundColor: 'var(--primary-light)', flexShrink: 0, border: '2px solid var(--border)'
          }}>
            <img
              src={event.teacher.avatar_url || '/default-avatar.svg'}
              alt={event.teacher.full_name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
            Prof. {event.teacher.full_name}
          </span>
        </div>

        {/* Data/Hora */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem',
          textTransform: 'capitalize'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span>{dayLabel} · {timeLabel}</span>
        </div>

        {/* Descrição */}
        {event.description && (
          <p style={{
            fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: 1.6,
            margin: '0 0 1.25rem', borderLeft: '3px solid var(--primary)',
            paddingLeft: '0.75rem', whiteSpace: 'pre-wrap'
          }}>
            {event.description}
          </p>
        )}

        {/* Barra de Vagas */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '0.4rem'
          }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Participantes
            </span>
            <span style={{
              fontSize: '0.78rem', fontWeight: 700,
              color: isFull ? '#dc2626' : isAlmostFull ? '#d97706' : 'var(--text-muted)'
            }}>
              {isFull ? 'Lotado' : `${spotsLeft} ${spotsLeft === 1 ? 'vaga' : 'vagas'} restante${spotsLeft === 1 ? '' : 's'}`}
              {' '}· {event.participant_count}/{event.max_participants}
            </span>
          </div>
          <div style={{
            height: 6, backgroundColor: 'var(--bg-hover)', borderRadius: '99px', overflow: 'hidden'
          }}>
            <div style={{
              height: '100%', borderRadius: '99px', transition: 'width 0.4s ease',
              width: `${fillPercent}%`,
              background: isFull
                ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                : isAlmostFull
                ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                : 'linear-gradient(90deg, var(--primary), #7c3aed)'
            }} />
          </div>
        </div>

        {/* Botão de ação (apenas alunos e com evento ativo) */}
        {isStudent && !isEnded && (
          <div style={{ marginBottom: canSeeEntryButton ? '0.75rem' : 0 }}>
            <JoinEventButton
              eventId={event.id}
              isParticipating={event.is_participating}
              isFull={isFull}
              isAlmostFull={isAlmostFull}
              participantCount={event.participant_count}
              maxParticipants={event.max_participants}
            />
          </div>
        )}

        {/* Botão Principal de Entrada (Para participantes e staff) */}
        {canSeeEntryButton && (
          <div style={{ width: '100%', borderTop: (isStudent && !isEnded) ? '1px solid var(--border)' : 'none', paddingTop: (isStudent && !isEnded) ? '1rem' : 0 }}>
            {isEnded ? (
              <div style={{ width: '100%', textAlign: 'center', padding: '0.75rem', backgroundColor: 'var(--bg-hover)', borderRadius: '12px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
                Evento Finalizado
              </div>
            ) : (
              <a
                href={canEnter && meetLink !== '#' ? meetLink : '#'}
                onClick={(e) => {
                  if (canEnter && (!meetLink || meetLink === '#')) {
                    e.preventDefault()
                    alert('Este evento ainda não possui um link de reunião configurado.')
                  }
                }}
                target={canEnter && meetLink !== '#' ? '_blank' : undefined}
                rel={canEnter && meetLink !== '#' ? 'noopener noreferrer' : undefined}
                className={`btn-primary ${(!canEnter || !meetLink || meetLink === '#') && 'disabled'}`}
                style={{ 
                  display: 'flex', width: '100%', justifyContent: 'center', alignItems: 'center',
                  padding: '0.85rem', fontSize: '0.95rem', borderRadius: '12px',
                  opacity: (canEnter && meetLink !== '#') ? 1 : 0.6, cursor: (canEnter && meetLink !== '#') ? 'pointer' : 'not-allowed'
                }}
              >
                {isOngoing ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Entrar no Evento
                    <span style={{ fontSize: '0.65rem', backgroundColor: 'rgba(255,255,255,0.25)', padding: '0.2rem 0.5rem', borderRadius: '99px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ao Vivo</span>
                  </span>
                ) : canEnter ? 'Entrar no Evento' : 'Em breve'}
              </a>
            )}
          </div>
        )}
      </div>

      {/* Keyframe para o pulse do badge */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.85); }
        }
      `}</style>
    </article>
  )
}
