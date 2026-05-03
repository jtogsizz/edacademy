import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import { format } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import { cookies } from 'next/headers'
import AdminCancellationControls from './AdminCancellationControls'
import TeacherSelector from './TeacherSelector'
import { getUnifiedTeacherAgenda } from '@/utils/agendaUtils'
import MeetLinkButton from '@/components/MeetLinkButton'

export default async function TeacherAgendaPage({ searchParams }: { searchParams: Promise<{ teacher_id?: string }> }) {
  const { teacher_id: qTeacherId } = await searchParams
  const supabase = await createClient()
  const cookieStore = await cookies()
  const clientTz = cookieStore.get('client_tz')?.value
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('id, role, timezone').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'admin_master' && profile?.role !== 'suporte' && profile?.role !== 'dev') redirect('/dashboard')

  const isManager = profile?.role === 'admin_master' || profile?.role === 'dev' || profile?.role === 'suporte'

  // Managers podem selecionar professor pelo query param; admin regular vê apenas a própria agenda
  let viewingTeacherId = user.id
  let teacherList: { id: string; full_name: string }[] = []

  if (isManager) {
    const { data: teachers } = await supabase
      .from('profiles')
      .select('id, full_name, meet_url')
      .in('role', ['admin', 'admin_master'])
      .order('full_name')
    teacherList = teachers || []
    
    // Usa o query param se for um ID válido da lista.
    if (qTeacherId && teacherList.some(t => t.id === qTeacherId)) {
      viewingTeacherId = qTeacherId
    } else if (teacherList.length > 0 && profile?.role !== 'admin_master') {
      // Se for dev/suporte (não tem agenda própria), cai na agenda do primeiro professor
      viewingTeacherId = teacherList[0].id
    }
  }

  const viewingTeacher = isManager
    ? teacherList.find(t => t.id === viewingTeacherId) || { id: '', full_name: 'Minha Agenda' }
    : null

  const userTz = profile?.timezone || clientTz || 'America/Sao_Paulo'
  const isFallback = !profile?.timezone && !clientTz

  // 1. Appointments pontuais (remarcações, extras)
  let appointmentsQuery = supabase
    .from('appointments')
    .select(`
      id,
      start_time,
      end_time,
      status,
      teacher_id,
      teacher:profiles!appointments_teacher_id_fkey ( id, full_name, meet_url ),
      student:profiles!appointments_student_id_fkey ( id, full_name, whatsapp_number )
    `)
    .order('start_time', { ascending: true })
    .eq('teacher_id', viewingTeacherId)

  const { data: appointments } = await appointmentsQuery

  // 2. Aulas fixas recorrentes
  let recurringQuery = supabase
    .from('recurring_classes')
    .select(`
      id,
      day_of_week,
      start_time,
      end_time,
      teacher_id,
      teacher:profiles!recurring_classes_teacher_id_fkey ( id, full_name, meet_url ),
      student:profiles!recurring_classes_student_id_fkey ( id, full_name, whatsapp_number )
    `)
    .eq('teacher_id', viewingTeacherId)

  const { data: recurringClasses } = await recurringQuery

  // 3. Unificar e ordenar usando a lógica centralizada
  const allAppointments = getUnifiedTeacherAgenda(
    viewingTeacherId,
    recurringClasses || [],
    appointments || [],
    30
  )

  // Filtrar apenas futuros (a partir do momento atual real)
  const nowMoment = new Date()
  const upcomingApts = allAppointments.filter(apt => {
    const end = new Date(apt.end_time)
    return end >= nowMoment
  })

  // 4. Buscar link da aula
  const { data: settings } = await supabase.from('settings').select('fixed_meet_link').single()
  const meetLink = settings?.fixed_meet_link || 'https://meet.google.com/'

  const todayStr = format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '1000px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <Link href="/admin" style={{ color: 'var(--text-muted)', textDecoration: 'underline', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
            &larr; Voltar ao Início
          </Link>
          <h2 style={{ fontSize: '1.8rem', margin: 0, color: 'var(--primary)' }}>
            {isManager && viewingTeacher && viewingTeacher.id !== user.id ? `Agenda: ${viewingTeacher.full_name}` : 'Minha Agenda de Aulas'}
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Acompanhe e gerencie as aulas do período.</p>
          {isManager && teacherList.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <TeacherSelector teachers={teacherList} selectedId={viewingTeacherId} />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <AdminCancellationControls dateStr={todayStr} type="day" />
          <LogoutButton />
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {upcomingApts.length > 0 ? (
          upcomingApts.map((apt: any) => {
            const start = new Date(apt.start_time)
            const end = new Date(apt.end_time)
            const now = new Date()

            // Liberar acesso 10 min antes do início e durante toda a aula
            const earlyEntry = new Date(start.getTime() - 10 * 60 * 1000)
            const canEnter = now >= earlyEntry && now <= end
            const isOngoing = now >= start && now <= end
            const student = apt.student
            
            // Tratamento nativo do frontend sem afetar a database
            const displayStart = new Date(start.getTime() + 10 * 60 * 1000)
            const isCancelled = apt.status === 'cancelled'

            return (
              <div 
                key={apt.id} 
                className="card" 
                style={{ 
                  padding: '1.5rem', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  flexWrap: 'wrap', 
                  gap: '1.5rem', 
                  borderLeft: isCancelled ? '5px solid var(--text-muted)' : `5px solid ${apt.is_recurring ? 'var(--primary)' : '#EAB308'}`,
                  opacity: isCancelled ? 0.6 : 1,
                  backgroundColor: isCancelled ? 'var(--bg-main)' : (apt.is_recurring ? 'var(--bg-card)' : 'rgba(234, 179, 8, 0.05)'),
                  filter: isCancelled ? 'grayscale(0.5)' : 'none'
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
                        <span style={{fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '6px', fontWeight: 'normal'}}>
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
                          <AdminCancellationControls appointmentId={apt.id} type="single" />
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
          <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Nenhum agendamento encontrado</h3>
            <p>Você não possui aulas agendadas para o período selecionado.</p>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 600px) {
          .card[style*="justify-content: space-between"] { 
            flex-direction: column; 
            align-items: flex-start !important; 
            gap: 1.5rem;
          }
          div[style*="min-width: 80px"] {
             border-right: none !important;
             border-bottom: 1px solid var(--border);
             padding-right: 0 !important;
             padding-bottom: 0.75rem !important;
             width: 100%;
             text-align: left !important;
          }
        }
      `}} />
    </div>
  )
}
