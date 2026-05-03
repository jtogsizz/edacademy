'use client'

import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import PublicEventActions from './PublicEventActions'

interface PublicEventCardProps {
  event: any
  isLogged: boolean
}

export default function PublicEventCard({ event, isLogged }: PublicEventCardProps) {
  const start = new Date(event.start_time)
  const userTz = 'America/Sao_Paulo'

  const spotsLeft = event.max_participants - (event.participant_count || 0)
  const isFull = spotsLeft <= 0
  const isTodayEvent = formatInTimeZone(new Date(), userTz, 'yyyy-MM-dd') === formatInTimeZone(start, userTz, 'yyyy-MM-dd')
  const isNew = event.created_at && (new Date().getTime() - new Date(event.created_at).getTime()) < 1000 * 60 * 60 * 24 * 3 // 3 days

  return (
    <div 
      className="card premium-event-card" 
      style={{ 
        height: '100%',
        display: 'flex', 
        flexDirection: 'column',
        padding: '2.5rem',
        borderRadius: '32px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #F3F4F6',
        boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
        transition: 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Badges Suaves */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '2rem',
        flexWrap: 'wrap'
      }}>
        {isTodayEvent && (
          <div style={{
            padding: '0.5rem 1rem',
            borderRadius: '99px',
            fontSize: '0.75rem',
            fontWeight: 800,
            backgroundColor: '#0f0f0f',
            color: '#fff',
            letterSpacing: '0.02em'
          }}>
            AO VIVO HOJE
          </div>
        )}
        {spotsLeft > 0 && spotsLeft < 5 && (
          <div style={{
            padding: '0.5rem 1rem',
            borderRadius: '99px',
            fontSize: '0.75rem',
            fontWeight: 800,
            backgroundColor: 'rgba(234, 88, 12, 0.1)',
            color: 'var(--primary)',
          }}>
            Últimas {spotsLeft} vagas
          </div>
        )}
        {isNew && (
          <div style={{
            padding: '0.5rem 1rem',
            borderRadius: '99px',
            fontSize: '0.75rem',
            fontWeight: 800,
            backgroundColor: '#F3F4F6',
            color: '#4B5563',
          }}>
            Novo evento
          </div>
        )}
      </div>

      {/* Título e Horário */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ 
            fontSize: '1.6rem', 
            fontWeight: 900, 
            color: '#0f0f0f', 
            lineHeight: 1.2,
            letterSpacing: '-0.02em'
          }}>
            {event.title}
          </h3>
          
          <div style={{
            textAlign: 'right',
            flexShrink: 0
          }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)', lineHeight: 1 }}>
              {formatInTimeZone(start, userTz, 'dd')}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#9CA3AF' }}>
              {formatInTimeZone(start, userTz, 'MMM', { locale: ptBR })}
            </div>
          </div>
        </div>

        <p style={{ fontSize: '1.05rem', color: '#6B7280', lineHeight: 1.6, marginBottom: '2.5rem', fontWeight: 500 }}>
          {event.description || 'Participe desta aula exclusiva e impulsione seu aprendizado com nossos melhores professores.'}
        </p>

        {/* Detalhes Compactos */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '1.5rem', 
          marginBottom: '2.5rem',
          padding: '1.5rem',
          backgroundColor: '#F9FAFB',
          borderRadius: '20px'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Professor</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#E5E7EB', overflow: 'hidden' }}>
                 <img src={event.teacher?.avatar_url || '/default-avatar.svg'} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f0f0f' }}>{event.teacher?.full_name?.split(' ')[0]}</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Horário</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f0f0f' }}>
              {formatInTimeZone(start, userTz, 'HH:mm')} BRT
            </div>
          </div>
        </div>
      </div>

      {/* Ação Principal */}
      <div style={{ marginTop: 'auto' }}>
        <PublicEventActions 
          eventId={event.id}
          isLogged={isLogged}
          isParticipating={event.is_participating}
          maxParticipants={event.max_participants}
          participantCount={event.participant_count}
        />
      </div>

      <style jsx>{`
        .premium-event-card:hover {
          transform: translateY(-12px);
          box-shadow: 0 40px 80px rgba(0,0,0,0.06);
          border-color: var(--primary);
        }
      `}</style>
    </div>
  )
}
