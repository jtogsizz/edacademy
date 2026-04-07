import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import AdminCancellationControls from './AdminCancellationControls'

export default async function TeacherAgendaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('id, role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'admin_master') redirect('/dashboard')

  // 1. Buscar todas as aulas agendadas para este professor
  const { data: appointments } = await supabase
    .from('appointments')
    .select(`
      id,
      start_time,
      end_time,
      status,
      student:profiles!appointments_student_id_fkey (
        id,
        full_name,
        whatsapp_number
      )
    `)
    .eq('teacher_id', user.id)
    .eq('status', 'scheduled')
    .order('start_time', { ascending: true })

  // 2. Buscar link da aula
  const { data: settings } = await supabase.from('settings').select('fixed_meet_link').single()
  const meetLink = settings?.fixed_meet_link || 'https://meet.google.com/'

  const upcomingApts = (appointments ?? []).filter((apt: any) => {
    const end = new Date(apt.end_time)
    const today = new Date(); today.setHours(0,0,0,0)
    return end >= today
  })

  // Data de hoje para cancelamento de dia
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '1000px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <Link href="/admin" style={{ color: 'var(--text-muted)', textDecoration: 'underline', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
            &larr; Voltar ao Início
          </Link>
          <h2 style={{ fontSize: '1.8rem', margin: 0, color: 'var(--primary)' }}>Minha Agenda de Aulas</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Acompanhe e gerencie as aulas do dia.</p>
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
            
            // Janela de acesso
            const canEnter = now >= start && now <= end
            const student = apt.student

            return (
              <div key={apt.id} className="card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', borderLeft: '5px solid var(--primary)' }}>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center', minWidth: '80px', borderRight: '1px solid var(--border)', paddingRight: '1.5rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      {format(start, 'EEE', { locale: ptBR })}
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>{format(start, 'dd/MM')}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                      {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
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
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Ações Administrativas</div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <AdminCancellationControls appointmentId={apt.id} type="single" />
                      <a 
                        href={canEnter ? meetLink : '#'}
                        target={canEnter ? "_blank" : undefined}
                        rel={canEnter ? "noopener noreferrer" : undefined}
                        className={`btn-primary ${!canEnter && 'disabled'}`}
                        style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem', opacity: canEnter ? 1 : 0.4, cursor: canEnter ? 'pointer' : 'not-allowed' }}
                      >
                        {canEnter ? 'Entrar Agora' : 'Em breve'}
                      </a>
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
