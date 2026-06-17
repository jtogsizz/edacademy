import { createClient } from '@/utils/supabase/server'
import Feed from '@/components/Feed'
import LogoutButton from '@/components/LogoutButton'
import NotificationBell from '@/components/NotificationBell'
import Link from 'next/link'
import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import { getUnifiedStudentAgenda } from '@/utils/agendaUtils'
import { unstable_noStore as noStore } from 'next/cache'
import { markPaymentPending } from '@/app/dashboard/actions'
import { getTranslation } from '@/i18n/server'

export default async function StudentDashboardView({ user, profile, clientTz }: any) {
  noStore()
  const supabase = await createClient()
  const t = await getTranslation()

  const userTz = profile?.timezone || clientTz || 'America/Sao_Paulo'
  const now = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999)

  // Queries paralelas
  const [
    { data: subscription },
    { data: recurring },
    { data: appointments },
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
  ])

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

  return (
    <div className="container" style={{ padding: '1.5rem 1.5rem', paddingBottom: '6rem', maxWidth: '900px' }}>

      {/* ── Header ── */}
      <header className="internal-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
            {t.dashboard.hello} {firstName} 👋
          </p>
          <h1 className="internal-title">{t.nav.home}</h1>
          <p className="internal-subtitle">
            {formatInTimeZone(now, userTz, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="internal-header-actions">
          <NotificationBell href="/dashboard/notifications" />
          <LogoutButton />
        </div>
      </header>

      {/* ── Pagamento pendente ── */}
      {subscription?.status === 'inactive' && (
        <div style={{
          border: '1.5px solid var(--border)', background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)', padding: '1.25rem', marginBottom: '1.25rem',
          display: 'flex', flexDirection: 'column', gap: '0.75rem'
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{t.dashboard.inactiveAccountTitle}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              {t.dashboard.inactiveAccountDesc}
            </div>
          </div>
          <form action={async () => {
            'use server'
            await markPaymentPending()
          }}>
            <button
              type="submit"
              className="btn-primary"
              style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}
            >
              {t.payment.confirmPayment}
            </button>
          </form>
        </div>
      )}

      {/* ── Pagamento em análise ── */}
      {subscription?.status === 'pending_confirmation' && (
        <div style={{
          background: 'rgba(234,88,12,0.08)', border: '1px solid rgba(234,88,12,0.2)',
          borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem', marginBottom: '1.25rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem'
        }}>
          <div style={{ color: '#D97706' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#B45309', fontSize: '0.88rem' }}>{t.payment.inReview}</div>
            <div style={{ fontSize: '0.8rem', color: '#B45309', opacity: 0.85, marginTop: '0.1rem' }}>
              {t.dashboard.overviewSubtitle}
            </div>
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


      {/* ── Próxima aula ── */}
      {nextClass && (
        <>
          <div className="section-label">{t.dashboard.nextClassTitle}</div>
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
                    {(nextClass as any).is_recurring ? t.myClassesPage.fixedClass : t.myClassesPage.replacementClass}
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
          .today-card { padding: 1rem !important; }
        }
      `}} />
    </div>
  )
}
