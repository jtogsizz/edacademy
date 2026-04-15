import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import { getUnifiedStudentAgenda } from '@/utils/agendaUtils'
import { unstable_noStore as noStore } from 'next/cache'
import { cookies } from 'next/headers'

export const metadata = { title: 'Minhas Aulas' }

export default async function MinhasAulasPage() {
  noStore()
  const supabase = await createClient()
  const cookieStore = await cookies()
  const clientTz = cookieStore.get('client_tz')?.value

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, timezone').eq('id', user.id).single()
  if (profile?.role === 'admin' || profile?.role === 'admin_master') redirect('/admin/agenda')

  const { data: subscription } = await supabase.from('subscriptions').select('status').eq('student_id', user.id).maybeSingle()
  const isActive = subscription?.status === 'active'

  const userTz = profile?.timezone || clientTz || 'America/Sao_Paulo'
  const isFallback = !profile?.timezone && !clientTz

  // Buscar aulas recorrentes e agendamentos
  const { data: recurring } = await supabase
    .from('recurring_classes')
    .select('*, teacher:profiles!recurring_classes_teacher_id_fkey(id, full_name, whatsapp_number)')
    .eq('student_id', user.id)

  const { data: appointments } = await supabase
    .from('appointments')
    .select(`
      id, start_time, end_time, status,
      teacher:profiles!appointments_teacher_id_fkey ( id, full_name, whatsapp_number )
    `)
    .eq('student_id', user.id)
    .order('start_time', { ascending: true })

  const { data: settings } = await supabase.from('settings').select('fixed_meet_link').single()
  const meetLink = settings?.fixed_meet_link || 'https://meet.google.com/'

  // Agenda unificada — próximas 30 dias
  const upcoming = getUnifiedStudentAgenda(user.id, recurring || [], appointments || [], 30)

  // Histórico — appointments passados (últimos 90 dias), excluindo cancelados fantasmas sem sentido
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const history = (appointments || [])
    .filter(apt => new Date(apt.end_time) < new Date() && new Date(apt.start_time) >= ninetyDaysAgo)
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', paddingBottom: '6rem', maxWidth: '900px' }}>
      {/* Header */}
      <header style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Minhas Aulas</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Próximas aulas agendadas e histórico completo.
        </p>
      </header>

      {/* ===== PRÓXIMAS AULAS ===== */}
      <section style={{ marginBottom: '3rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: 'var(--primary)' }}>●</span> Próximas Aulas
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {upcoming.length > 0 ? upcoming.map((apt: any) => {
            const start = new Date(apt.start_time)
            const end = new Date(apt.end_time)
            const now = new Date()
            const earlyEntry = new Date(start.getTime() - 10 * 60 * 1000)
            const canEnter = now >= earlyEntry && now <= end
            const isOngoing = now >= start && now <= end
            const isCancelled = apt.status === 'cancelled'
            const displayStart = new Date(start.getTime() + 10 * 60 * 1000)
            const teacher = apt.teacher

            return (
              <div
                key={apt.id}
                className="card"
                style={{
                  padding: '1.2rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1.5rem',
                  borderLeft: isCancelled ? '4px solid var(--text-muted)' : `4px solid ${apt.is_recurring ? 'var(--primary)' : '#EAB308'}`,
                  opacity: isCancelled ? 0.6 : 1,
                  backgroundColor: isCancelled ? 'var(--bg-main)' : (apt.is_recurring ? 'var(--bg-card)' : 'rgba(234, 179, 8, 0.05)'),
                  filter: isCancelled ? 'grayscale(1)' : 'none'
                }}
              >
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center', minWidth: '45px', borderRight: '1px solid var(--border)', paddingRight: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{formatInTimeZone(start, userTz, 'MMM', { locale: ptBR })}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: isCancelled ? 'var(--text-muted)' : 'var(--primary)' }}>{formatInTimeZone(start, userTz, 'dd')}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: isCancelled ? 'var(--error)' : (apt.is_recurring ? 'var(--text-muted)' : '#CA8A04'), marginBottom: '0.2rem', fontWeight: (isCancelled || !apt.is_recurring) ? 700 : 400 }}>
                      {isCancelled ? '● CANCELADA / REMARCADA' : (apt.is_recurring ? 'AULA FIXA DO PLANO' : 'REPOSIÇÃO / EXTRA')}
                    </div>
                    <div style={{ fontWeight: 600, textDecoration: isCancelled ? 'line-through' : 'none' }}>
                      {formatInTimeZone(displayStart, userTz, 'HH:mm')} - {formatInTimeZone(end, userTz, 'HH:mm')}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px' }}>{!isFallback ? '(seu fuso)' : '(padrão BR)'}</span>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Prof. {teacher?.full_name}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  {isCancelled ? (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, padding: '0.5rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>Indisponível</span>
                  ) : (
                    <>
                      {!isOngoing && (
                        <Link
                          href={`/dashboard/schedule?teacher_id=${teacher?.id}&reschedule_id=${apt.id}`}
                          className="btn-outline"
                          style={{ color: 'var(--error)', borderColor: 'var(--error)', padding: '0.5rem 1rem', fontSize: '0.85rem', textDecoration: 'none' }}
                        >
                          Remarcar
                        </Link>
                      )}
                      <a
                        href={canEnter ? meetLink : '#'}
                        target={canEnter ? '_blank' : undefined}
                        rel={canEnter ? 'noopener noreferrer' : undefined}
                        className={`btn-primary ${!canEnter && 'disabled'}`}
                        style={{ padding: '0.5rem 1.5rem', fontSize: '0.85rem', opacity: canEnter ? 1 : 0.4, cursor: canEnter ? 'pointer' : 'not-allowed' }}
                      >
                        {isOngoing ? 'Entrar na Aula' : canEnter ? 'Sala aberta' : 'Em breve'}
                      </a>
                    </>
                  )}
                </div>
              </div>
            )
          }) : (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)' }}>
              Nenhuma aula nos próximos 30 dias.
            </div>
          )}
        </div>

        {/* CTA para agendar extra */}
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <Link href="/dashboard/schedule" className="btn-primary" style={{ display: 'inline-flex', padding: '0.8rem 2.5rem', opacity: isActive ? 1 : 0.5, pointerEvents: isActive ? 'auto' : 'none' }}>
            + Agendar Aula Extra
          </Link>
          {!isActive && <p style={{ fontSize: '0.8rem', color: 'var(--error)', marginTop: '0.5rem' }}>Plano inativo — não é possível agendar.</p>}
        </div>
      </section>

      {/* ===== HISTÓRICO ===== */}
      <section>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>◷</span> Histórico (últimos 90 dias)
        </h3>

        {history.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {history.map((apt: any) => {
              const start = new Date(apt.start_time)
              const end = new Date(apt.end_time)
              const isCancelled = apt.status === 'cancelled'
              const displayStart = new Date(start.getTime() + 10 * 60 * 1000)

              return (
                <div
                  key={apt.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.9rem 1.2rem',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    opacity: isCancelled ? 0.65 : 1,
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', textDecoration: isCancelled ? 'line-through' : 'none', color: 'var(--text-main)' }}>
                      {formatInTimeZone(displayStart, userTz, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      Prof. {apt.teacher?.full_name}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.65rem',
                    borderRadius: '99px',
                    letterSpacing: '0.03em',
                    textTransform: 'uppercase',
                    backgroundColor: isCancelled ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                    color: isCancelled ? 'var(--error)' : 'var(--success)',
                    border: `1px solid ${isCancelled ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`
                  }}>
                    {isCancelled ? 'Cancelada' : 'Realizada'}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ padding: '2.5rem', textAlign: 'center', backgroundColor: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}>
            Nenhuma aula nos últimos 90 dias.
          </div>
        )}
      </section>
    </div>
  )
}
