import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import BookingCalendar from './BookingCalendar'
import { generateScheduleGrid } from './ScheduleEngine'

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: subscription } = await supabase.from('subscriptions').select('*').eq('student_id', user.id).single()
  if (subscription?.status !== 'active') redirect('/dashboard')

  // Resolvemos searchParams assíncronos (Next 15)
  const resolvedParams = await searchParams
  const teacherId = resolvedParams.teacher_id as string | undefined

  if (!teacherId) {
    // Tela 1: Escolha de Professor
    const { data: teachers } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role')
      .in('role', ['admin', 'admin_master'])
      .order('full_name', { ascending: true })

    return (
      <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '1000px' }}>
        <header style={{ marginBottom: '2rem' }}>
          <Link href="/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'underline', marginBottom: '1rem', display: 'inline-block' }}>
            &larr; Voltar ao Dashboard
          </Link>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Agendar Aula</h2>
          <p style={{ color: 'var(--text-muted)' }}>Comece escolhendo o professor com quem deseja ter aula.</p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
          {teachers?.map(teacher => (
            <Link key={teacher.id} href={`/dashboard/schedule?teacher_id=${teacher.id}`} style={{ textDecoration: 'none' }}>
              <div className="card hover-fx" style={{ padding: '1.5rem', textAlign: 'center', borderColor: 'var(--primary)', borderWidth: '2px', borderStyle: 'solid' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', margin: '0 auto 1rem auto', overflow: 'hidden' }}>
                  <img src={teacher.avatar_url || "/default-avatar.svg"} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <h3 style={{ margin: 0, color: 'var(--text-main)' }}>{teacher.full_name}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ver Agenda &rarr;</span>
              </div>
            </Link>
          ))}
          {(!teachers || teachers.length === 0) && (
            <div style={{ color: 'var(--text-muted)' }}>Nenhum professor encontrado na base.</div>
          )}
        </div>
      </div>
    )
  }

  // Tela 2: Calendário do Professor Específico
  const { data: teacherProfile } = await supabase.from('profiles').select('full_name').eq('id', teacherId).single()

  const { data: availability } = await supabase.from('teacher_availability').select('*').eq('teacher_id', teacherId)
  const { data: recurring } = await supabase.from('recurring_classes').select('*').eq('teacher_id', teacherId)
  
  const today = new Date()
  today.setHours(0,0,0,0)

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('teacher_id', teacherId)
    .gte('start_time', today.toISOString())

  const groupedDates = generateScheduleGrid(
    availability || [],
    recurring || [],
    appointments || [],
    user.id
  )

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '1000px' }}>
      <header style={{ marginBottom: '2rem' }}>
        <Link href="/dashboard/schedule" style={{ color: 'var(--text-muted)', textDecoration: 'underline', marginBottom: '1rem', display: 'inline-block' }}>
          &larr; Voltar para Professores
        </Link>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Agenda de {teacherProfile?.full_name}</h2>
        <p style={{ color: 'var(--text-muted)' }}>Escolha um dia livre para suas aulas.</p>
      </header>

      <BookingCalendar groupedDates={groupedDates} teacherId={teacherId} />
    </div>
  )
}
