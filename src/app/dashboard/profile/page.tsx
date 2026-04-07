import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import ProfileAvatarUpload from '@/components/ProfileAvatarUpload'
import RecurringClassForm from './RecurringClassForm'
import { getUnifiedStudentAgenda } from '@/utils/agendaUtils'

export default async function StudentProfilePage() {
  const supabase = await createClient()

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

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('student_id', user.id)
    .single()

  const isActive = subscription?.status === 'active'

  // 1. Buscar Professores Disponíveis
  const { data: teachers } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('role', ['admin', 'admin_master'])
    .order('full_name')

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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
        {/* Info Card com Upload de Avatar */}
        <section className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem' }}>
          <ProfileAvatarUpload currentAvatarUrl={profile?.avatar_url} userId={user.id} />
          
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{profile?.full_name}</h3>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{user.email}</div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className={`badge ${isActive ? 'badge-active' : 'badge-inactive'}`}>
                {isActive ? 'Assinatura Ativa' : 'Pendente / Inativa'}
              </span>
              <span className="badge" style={{ backgroundColor: 'var(--primary)', color: 'white' }}>
                {profile?.replacement_credits || 0} Créditos de Reposição
              </span>
            </div>
          </div>
        </section>

        {/* Contact Info */}
        <section className="card" style={{ padding: '1.5rem' }}>
          <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>WhatsApp</h4>
          <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{profile?.whatsapp_number || 'Telefone não cadastrado'}</div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>Utilizado para avisos automáticos e contato com professores.</p>
        </section>
      </div>

      {/* Recorrência Section */}
      <section className="card" style={{ marginBottom: '3rem', border: '1px solid var(--primary-light)' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Horários Fixos Recorrentes</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Escolha o seu horário oficial do plano (1 por semana).</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 1fr', gap: '2rem' }}>
          {/* Dynamic Form */}
          <RecurringClassForm teachers={teachers || []} />

          {/* Current Recurring List */}
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem', marginBottom: '1rem' }}>Minha Grade Semanal</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recurring && recurring.length > 0 ? (
                recurring.map(r => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{daysLabels[r.day_of_week]}, {r.start_time.slice(0,5)}</div>
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
                ))
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
            const canEnter = now >= start && now <= end
            const teacher = apt.teacher

            return (
              <div key={apt.id} className="card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', borderLeft: apt.is_recurring ? '4px solid var(--primary)' : '4px solid var(--success)' }}>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center', minWidth: '60px' }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{format(start, 'MMM', { locale: ptBR })}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>{format(start, 'dd')}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                      {apt.is_recurring ? 'AULA FIXA DO PLANO' : 'AULA DE REPOSIÇÃO / EXTRA'}
                    </div>
                    <div style={{ fontWeight: 600 }}>{format(start, 'HH:mm')} - {format(end, 'HH:mm')}</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Prof. {teacher?.full_name}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <Link 
                    href={`/dashboard/schedule?teacher_id=${teacher?.id}&reschedule_id=${apt.id}`}
                    className="btn-outline"
                    style={{ color: 'var(--error)', borderColor: 'var(--error)', padding: '0.5rem 1rem', fontSize: '0.85rem', textDecoration: 'none' }}
                  >
                    Remarcar
                  </Link>
                  <a 
                    href={canEnter ? meetLink : '#'}
                    target={canEnter ? "_blank" : undefined}
                    rel={canEnter ? "noopener noreferrer" : undefined}
                    className={`btn-primary ${!canEnter && 'disabled'}`}
                    style={{ padding: '0.5rem 1.5rem', fontSize: '0.85rem', opacity: canEnter ? 1 : 0.4, cursor: canEnter ? 'pointer' : 'not-allowed' }}
                  >
                    {canEnter ? 'Entrar na Aula' : 'Aula inicia em breve'}
                  </a>
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
          section[style*="grid-template-columns: minmax"] { grid-template-columns: 1fr !important; }
          .card[style*="justify-content: space-between"] { flex-direction: column; align-items: flex-start !important; }
        }
      `}} />
    </div>
  )
}