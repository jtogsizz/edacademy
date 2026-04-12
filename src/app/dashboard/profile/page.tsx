import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import { format } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import ProfileEditContainer from '@/components/ProfileEditContainer'
import RecurringClassForm from './RecurringClassForm'
import { getUnifiedStudentAgenda } from '@/utils/agendaUtils'
import { updateProfile } from '@/app/dashboard/actions'
import { unstable_noStore as noStore } from 'next/cache'
import { cookies } from 'next/headers'

export default async function StudentProfilePage() {
  // Garante que essa página sempre busca dados frescos do banco, nunca do cache
  noStore()
  const supabase = await createClient()

  const cookieStore = await cookies()
  const clientTz = cookieStore.get('client_tz')?.value

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'admin' || profile?.role === 'admin_master') {
    redirect('/admin')
  }

  const userTz = profile?.timezone || clientTz || 'America/Sao_Paulo'
  const isFallback = !profile?.timezone && !clientTz

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('student_id', user.id)
    .single()

  const isActive = subscription?.status === 'active'

  // 1. Buscar Professores Disponíveis — filtrar pelo idioma do aluno
  let teachersQuery = supabase
    .from('profiles')
    .select('id, full_name')
    .in('role', ['admin', 'admin_master'])
    .order('full_name')

  if (profile?.student_language) {
    teachersQuery = teachersQuery.eq('language', profile.student_language)
  }

  const { data: teachers } = await teachersQuery

  // 2. Buscar Horários Fixos (Recorrência) do aluno
  const { data: recurring } = await supabase
    .from('recurring_classes')
    .select('*, teacher:profiles!recurring_classes_teacher_id_fkey(id, full_name)')
    .eq('student_id', user.id)

  // 3. Buscar Agendamentos Reais (Appointments)
  const { data: appointments } = await supabase
    .from('appointments')
    .select(`
      id,
      start_time,
      end_time,
      status,
      teacher:profiles!appointments_teacher_id_fkey (
        id,
        full_name,
        whatsapp_number
      )
    `)
    .eq('student_id', user.id)
    .order('start_time', { ascending: true })

  // 4. Gerar Agenda Unificada (Recorrência + Appointments)
  const unifiedAgenda = getUnifiedStudentAgenda(
    user.id,
    recurring || [],
    appointments || [],
    30 // Ver próximos 30 dias
  )

  const { data: settings } = await supabase
    .from('settings')
    .select('fixed_meet_link')
    .single()

  const meetLink = settings?.fixed_meet_link || 'https://meet.google.com/'
  const daysLabels = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', paddingBottom: '6rem', maxWidth: '1000px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Meu Perfil</h2>
          <p style={{ color: 'var(--text-muted)' }}>Gerencie suas aulas e agenda semanal.</p>
        </div>
        <LogoutButton />
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(Min(100%, 350px), 1fr))', gap: '2rem', marginBottom: '3rem' }}>
        {/* Info Card com Upload de Avatar e Form de Edição */}
        <section className="card" style={{ padding: '1.5rem' }}>
          <ProfileEditContainer 
            userId={user.id} 
            initialProfile={{
              full_name: profile?.full_name || '',
              whatsapp_number: profile?.whatsapp_number || '',
              instagram_handle: profile?.instagram_handle || '',
              avatar_url: profile?.avatar_url || null,
              timezone: profile?.timezone || null
            }}
            isReadOnly={false}
            userRole={profile?.role}
            saveAction={updateProfile}
          />
        </section>

        {/* Status Info — Plano e Idioma */}
        <section className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>Sua Conta</h4>

          {/* Status do Plano */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Plano</div>
              <div style={{ fontWeight: 600 }}>{isActive ? 'EdAcademy Pro' : 'Sem plano ativo'}</div>
            </div>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '0.25rem 0.65rem',
              borderRadius: '99px',
              backgroundColor: isActive ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.12)',
              color: isActive ? '#059669' : 'var(--error)',
              border: `1px solid ${isActive ? 'rgba(52, 211, 153, 0.35)' : 'rgba(239, 68, 68, 0.25)'}`,
              letterSpacing: '0.03em',
              textTransform: 'uppercase'
            }}>
              {isActive ? '● Ativo' : '● Inativo'}
            </span>
          </div>

          {/* Idioma com Acesso */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Idioma</div>
              <div style={{ fontWeight: 600 }}>
                {profile?.student_language
                  ? ({'english':'Inglês','spanish':'Espanhol','french':'Francês','portuguese':'Português','german':'Alemão','italian':'Italiano','mandarin':'Mandarim','japanese':'Japonês'} as Record<string,string>)[profile.student_language] ?? profile.student_language
                  : 'Não definido'}
              </div>
            </div>
            {profile?.student_language ? (
              <span style={{ fontSize: '1.3rem' }}>
                {({'english':'🇺🇸','spanish':'🇪🇸','french':'🇫🇷','portuguese':'🇧🇷','german':'🇩🇪','italian':'🇮🇹','mandarin':'🇨🇳','japanese':'🇯🇵'} as Record<string,string>)[profile.student_language] ?? '🌐'}
              </span>
            ) : null}
          </div>

          {/* Fuso Horário */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Fuso Horário</div>
              <div style={{ fontWeight: 600 }}>
                {profile?.timezone ? profile.timezone : (clientTz ? `${clientTz} (sincronizado)` : 'Não detectado')}
              </div>
            </div>
            <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>🕒</span>
          </div>

          {/* Vencimento */}
          {subscription?.end_date && (
            <div style={{ padding: '0.85rem 1rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Válido até</div>
              <div style={{ fontWeight: 600 }}>{new Date(subscription.end_date).toLocaleDateString('pt-BR')}</div>
            </div>
          )}

          {!isActive && (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '1rem', lineHeight: 1.5 }}>
              Para ativar seu acesso, entre em contato com a equipe EdAcademy.
            </p>
          )}
        </section>
      </div>


      {/* Recorrência Section */}
      <section className="card" style={{ marginBottom: '3rem', border: '1px solid var(--primary-light)' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Horários Fixos Recorrentes</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Escolha o seu horário oficial do plano (1 por semana).</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(Min(100%, 350px), 1fr))', gap: '2rem' }}>
          {/* Dynamic Form */}
          <RecurringClassForm teachers={teachers || []} userTimezone={userTz} />

          {/* Current Recurring List */}
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem', marginBottom: '1rem' }}>Minha Grade Semanal</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recurring && recurring.length > 0 ? (
                recurring.map(r => {
                  const [h, m] = r.start_time.split(':').map(Number)
                  // Build a deterministic UTC Date for this recurring slot using the current year/month to avoid DST issues from year 2000
                  const now = new Date()
                  const utcBase = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, m, 0))
                  
                  // Adjust to display the correct day of week in the browser's context
                  while (utcBase.getUTCDay() !== r.day_of_week) {
                    utcBase.setUTCDate(utcBase.getUTCDate() + 1)
                  }
                  
                  // Apply 10 mins rule - Always standardize display to class start (+10min)
                  const displayStart = new Date(utcBase.getTime() + 10 * 60 * 1000)
                  
                  return (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--primary)', textTransform: 'capitalize' }}>
                          {formatInTimeZone(displayStart, userTz, "EEEE, HH:mm", { locale: ptBR })}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Prof. {r.teacher?.full_name}</div>
                      </div>
                    <form action={async () => {
                      'use server'
                      const { removeRecurringClass } = await import('@/app/dashboard/schedule/actions')
                      await removeRecurringClass(r.id)
                    }}>
                      <button type="submit" style={{ background: 'none', border: 'none', color: 'var(--error)', fontSize: '0.8rem', cursor: 'pointer', padding: '0.5rem' }}>Remover</button>
                    </form>
                  </div>
                )})
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '0.9rem', border: '1px dashed var(--border)' }}>Você ainda não definiu seu horário fixo.</div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Aulas Marcadas (Agenda Unificada) */}
      <h3 style={{ fontSize: '1.4rem', marginBottom: '1.5rem' }}>Próximas Aulas Agendadas</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {unifiedAgenda.length > 0 ? (
          unifiedAgenda.map((apt: any) => {
            const start = new Date(apt.start_time)
            const end = new Date(apt.end_time)
            const now = new Date()
            // Liberar acesso 10 min antes do início e durante toda a aula
            const earlyEntry = new Date(start.getTime() - 10 * 60 * 1000)
            const canEnter = now >= earlyEntry && now <= end
            const isOngoing = now >= start && now <= end
            const teacher = apt.teacher
            const displayStart = new Date(start.getTime() + 10 * 60 * 1000)
            const isCancelled = apt.status === 'cancelled'

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
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: isCancelled ? 'var(--error)' : (apt.is_recurring ? 'var(--text-muted)' : '#CA8A04'), 
                      marginBottom: '0.2rem', 
                      fontWeight: (isCancelled || !apt.is_recurring) ? 700 : 400 
                    }}>
                      {isCancelled ? '● AULA CANCELADA / REMARCADA' : (apt.is_recurring ? 'AULA FIXA DO PLANO' : 'AULA DE REPOSIÇÃO / EXTRA')}
                    </div>
                    <div style={{ fontWeight: 600, textDecoration: isCancelled ? 'line-through' : 'none' }}>
                      <>{formatInTimeZone(displayStart, userTz, 'HH:mm')} - {formatInTimeZone(end, userTz, 'HH:mm')} <span style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px'}}>{!isFallback ? '(seu fuso)' : '(padrão BR)'}</span></>
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
                        target={canEnter ? "_blank" : undefined}
                        rel={canEnter ? "noopener noreferrer" : undefined}
                        className={`btn-primary ${!canEnter && 'disabled'}`}
                        style={{ padding: '0.5rem 1.5rem', fontSize: '0.85rem', opacity: canEnter ? 1 : 0.4, cursor: canEnter ? 'pointer' : 'not-allowed' }}
                      >
                        {isOngoing ? 'Entrar na Aula' : canEnter ? 'Sala aberta' : 'Aula inicia em breve'}
                      </a>
                    </>
                  )}
                </div>
              </div>
            )
          })
        ) : (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Nenhuma aula encontrada para os próximos 30 dias.
          </div>
        )}
      </div>

      <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
        {(profile?.replacement_credits || 0) > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <Link href="/dashboard/schedule" className="btn-primary" style={{ display: 'inline-flex', padding: '1rem 3rem' }}>
              Agendar Aula Extra
            </Link>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Você possui {profile.replacement_credits} crédito(s) disponível(is).</p>
          </div>
        ) : (
          <div style={{ padding: '2rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-main)' }}>
            <button className="btn-primary disabled" style={{ cursor: 'not-allowed', opacity: 0.5, padding: '1.2rem 3rem' }}>
              Agendar Aula Extra (Indisponível)
            </button>
            <p style={{ marginTop: '1rem', color: 'var(--error)', fontSize: '0.9rem', fontWeight: 500 }}>
              Você não possui créditos de reposição no momento.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Créditos são gerados automaticamente quando o professor desmarcar sua aula.
            </p>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 600px) {
          *[style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
          .card[style*="justify-content: space-between"] { flex-direction: column; align-items: flex-start !important; }
          .save-button-container { width: 100%; }
          .save-button-container button { width: 100%; justify-content: center; }
        }
      `}} />
    </div>
  )
}