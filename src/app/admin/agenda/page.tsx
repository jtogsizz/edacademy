import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'
import { format } from 'date-fns'
import { cookies } from 'next/headers'
import TeacherSelector from './TeacherSelector'
import { getUnifiedTeacherAgenda } from '@/utils/agendaUtils'
import InternalPageHeader from '@/components/InternalPageHeader'
import NotificationBell from '@/components/NotificationBell'
import AdminCancellationControls from './AdminCancellationControls'
import AgendaCardList from './AgendaCardList'

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
    <div className="container" style={{ padding: '2rem 1.5rem', paddingBottom: '6rem', maxWidth: '1000px' }}>

      <InternalPageHeader
        title={isManager && viewingTeacher && viewingTeacher.id !== user.id ? `Agenda: ${viewingTeacher.full_name}` : 'Minha Agenda'}
        subtitle="Acompanhe e gerencie as aulas do período"
        breadcrumb={[{ label: 'Dashboard', href: '/admin' }, { label: 'Agenda' }]}
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <AdminCancellationControls dateStr={todayStr} type="day" />
            <NotificationBell href="/admin/notifications" />
            <LogoutButton />
          </div>
        }
      />

      {isManager && teacherList.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <TeacherSelector teachers={teacherList} selectedId={viewingTeacherId} />
        </div>
      )}

      <AgendaCardList
        items={upcomingApts as any}
        userTz={userTz}
        isFallback={isFallback}
        isManager={isManager}
      />

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
