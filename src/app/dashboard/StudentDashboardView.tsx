import { createClient } from '@/utils/supabase/server'
import Feed from '@/components/Feed'
import LogoutButton from '@/components/LogoutButton'
import NotificationBell from '@/components/NotificationBell'
import Link from 'next/link'
import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import { getUnifiedStudentAgenda } from '@/utils/agendaUtils'
import { unstable_noStore as noStore } from 'next/cache'

export default async function StudentDashboardView({ user, profile, clientTz }: any) {
  noStore()
  const supabase = await createClient()

  const userTz = profile?.timezone || clientTz || 'America/Sao_Paulo'
  const now = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999)

  // Queries paralelas
  const [
    { data: subscription },
    { data: recurring },
    { data: appointments },
    { data: recentNotifs },
  ] = await Promise.all([
    supabase.from('subscriptions').select('status, end_date, plan_type').eq('student_id', user.id).maybeSingle(),
    supabase.from('recurring_classes')
      .select('*, teacher:profiles!recurring_classes_teacher_id_fkey(id, full_name)')
      .eq('student_id', user.id),
    supabase.from('appointments')
      .select('id, start_time, end_time, status, teacher:profiles!appointments_teacher_id_fkey(id, full_name)')
      .eq('student_id', user.id)
      .eq('status', 'scheduled')
      .gte('start_time', now.toISOString())
      .order('start_time', { ascending: true })
      .limit(10),
    supabase.from('notifications')
      .select('id, message, type, created_at, is_read')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  const isActive = subscription?.status === 'active'
  const endDate = subscription?.end_date ? new Date(subscription.end_date) : null
  const replacementCredits = profile?.replacement_credits ?? 0

  // Próximas aulas
  const allUpcoming = getUnifiedStudentAgenda(user.id, recurring ?? [], appointments ?? [], 30)
    .filter(apt => apt.status !== 'cancelled')

  const todayClasses = allUpcoming.filter(apt => {
    const s = new Date(apt.start_time)
    return s >= todayStart && s <= todayEnd
  })

  const nextClass = allUpcoming.find(apt => new Date(apt.start_time) > todayEnd)

  const firstName = profile?.full_name?.split(' ')[0] || 'Aluno'
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  // Subscription status visual
  const daysLeft = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / 86400000) : null

  return (
    <div className="container" style={{ padding: '1.5rem 1.5rem', paddingBottom: '6rem', maxWidth: '900px' }}>

      {/* ── Header ── */}
      <header className="internal-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
            {greeting}, {firstName} 👋
          </p>
          <h1 className="internal-title">Início</h1>
          <p className="internal-subtitle">
            {formatInTimeZone(now, userTz, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="internal-header-actions">
          <NotificationBell href="/dashboard/notifications" />
          <LogoutButton />
        </div>
      </header>

      {/* ── Plano / Status ── */}
      {isActive ? (
        <div style={{
          background: daysLeft !== null && daysLeft <= 7
            ? 'linear-gradient(135deg, #D97706 0%, #B45309 100%)'
            : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
          color: '#fff', borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.25rem', marginBottom: '1.25rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem',
        }}>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', opacity: 0.8 }}>
              Plano {subscription?.plan_type || 'ativo'}
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.15rem' }}>
              {daysLeft !== null
                ? daysLeft > 0 ? `Vence em ${daysLeft} dia${daysLeft !== 1 ? 's' : ''}` : 'Venceu hoje'
                : 'Ativo'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', opacity: 0.75 }}>Créditos de reposição</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1 }}>{replacementCredits}</div>
          </div>
        </div>
      ) : (
        <div style={{
          background: 'rgba(239,68,68,0.06)', border: '1.5px solid rgba(239,68,68,0.2)',
          borderRadius: 'var(--radius-lg)', padding: '0.9rem 1.25rem', marginBottom: '1.25rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem',
        }}>
          <div>
            <div style={{ fontWeight: 700, color: '#B91C1C', fontSize: '0.88rem' }}>Plano inativo</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Entre em contato com o suporte para ativar seu acesso.</div>
          </div>
        </div>
      )}

      {/* ── Aula de hoje ── */}
      {todayClasses.length > 0 && (
        <div className="today-card" style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.8, marginBottom: '0.4rem' }}>
            Aula de hoje
          </div>
          {todayClasses.slice(0, 2).map((apt: any) => (
            <div key={apt.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                  {formatInTimeZone(new Date(apt.start_time), userTz, 'HH:mm')}
                </div>
                <div style={{ opacity: 0.85, fontSize: '0.85rem', marginTop: '0.1rem' }}>
                  Prof. {apt.teacher?.full_name} · {apt.is_recurring ? 'Aula fixa' : 'Extra'}
                </div>
              </div>
              <Link href="/dashboard/minhas-aulas" style={{
                color: '#fff', fontSize: '0.8rem', fontWeight: 600,
                background: 'rgba(255,255,255,0.2)', borderRadius: 'var(--radius-md)',
                padding: '0.35rem 0.85rem', textDecoration: 'none',
              }}>
                Ver detalhes →
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* ── Cards de KPI ── */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(234,88,12,0.1)', color: 'var(--primary)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"/></svg>
          </div>
          <div className="stat-card-value">{todayClasses.length}</div>
          <div className="stat-card-label">Hoje</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#2563EB' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
          </div>
          <div className="stat-card-value">{allUpcoming.length}</div>
          <div className="stat-card-label">Agendadas</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: replacementCredits > 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)', color: replacementCredits > 0 ? '#059669' : '#DC2626' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1"/></svg>
          </div>
          <div className="stat-card-value" style={{ color: replacementCredits > 0 ? 'var(--text-main)' : '#DC2626' }}>{replacementCredits}</div>
          <div className="stat-card-label">Créditos</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(168,85,247,0.1)', color: '#7C3AED' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
          <div className="stat-card-value">{(recentNotifs ?? []).filter((n: any) => !n.is_read).length}</div>
          <div className="stat-card-label">Notificações</div>
        </div>
      </div>

      {/* ── Atalhos ── */}
      <div className="section-label">Atalhos rápidos</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
        <Link href="/dashboard/minhas-aulas" className="quick-action">
          <div className="quick-action-icon">📅</div>
          <span>Minhas Aulas</span>
        </Link>
        <Link href="/meus-eventos" className="quick-action">
          <div className="quick-action-icon">🎯</div>
          <span>Eventos</span>
        </Link>
        <Link href="/dashboard/chat" className="quick-action">
          <div className="quick-action-icon">💬</div>
          <span>Chat</span>
        </Link>
      </div>

      {/* ── Próxima aula ── */}
      {nextClass && (
        <>
          <div className="section-label">Próxima aula</div>
          <div className="internal-section" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', flexWrap: 'wrap' }}>
              <div style={{
                minWidth: 52, textAlign: 'center',
                borderRight: '1px solid rgba(229,231,235,0.5)', paddingRight: '1rem',
              }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {formatInTimeZone(new Date(nextClass.start_time), userTz, 'MMM', { locale: ptBR })}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1.1 }}>
                  {formatInTimeZone(new Date(nextClass.start_time), userTz, 'dd')}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {formatInTimeZone(new Date(nextClass.start_time), userTz, 'EEE', { locale: ptBR })}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  {formatInTimeZone(new Date(nextClass.start_time), userTz, 'HH:mm')}
                  {' '}–{' '}
                  {formatInTimeZone(new Date(nextClass.end_time), userTz, 'HH:mm')}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  Prof. {(nextClass as any).teacher?.full_name}
                  {' · '}
                  <span style={{ color: (nextClass as any).is_recurring ? 'var(--primary)' : '#D97706', fontWeight: 600 }}>
                    {(nextClass as any).is_recurring ? 'Aula fixa' : 'Extra'}
                  </span>
                </div>
              </div>
              <Link href="/dashboard/minhas-aulas" className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem', whiteSpace: 'nowrap' }}>
                Ver agenda
              </Link>
            </div>
          </div>
        </>
      )}

      {/* ── Feed ── */}
      <div className="section-label">Novidades e avisos</div>
      <Feed isAdmin={false} />

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 640px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}} />
    </div>
  )
}
