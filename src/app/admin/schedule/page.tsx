import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { utcToLocalTime } from '@/utils/agendaUtils'
import { AvailabilityForm } from './AdminConfigForms'

const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

export default async function AdminSchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const cookieStore = await cookies()
  const clientTz = cookieStore.get('client_tz')?.value

  const { data: profile } = await supabase.from('profiles').select('role, timezone').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'admin_master') redirect('/dashboard')

  // 1. Fetch Availability (Expediente Base)
  const { data: availability } = await supabase
    .from('teacher_availability')
    .select('*')
    .eq('teacher_id', user.id)
    .order('day_of_week')
    .order('start_time')

  // 2. Fetch Recurring Classes (Aulas Fixas - Apenas Leitura)
  const { data: recurring } = await supabase
    .from('recurring_classes')
    .select('*, student:profiles!recurring_classes_student_id_fkey(full_name)')
    .eq('teacher_id', user.id)
    .order('day_of_week')
    .order('start_time')

  const userTz = profile?.timezone || clientTz || 'America/Sao_Paulo'
  
  // Transform Availability para a Timezone do Professor
  const localAvail = (availability || []).map(av => {
    const startObj = utcToLocalTime(av.day_of_week, av.start_time, userTz)
    const endObj = utcToLocalTime(av.day_of_week, av.end_time, userTz)
    return {
      ...av,
      localDay: startObj.localDay,
      localStart: startObj.localTime,
      localEnd: endObj.localTime
    }
  }).sort((a,b) => {
    if (a.localDay !== b.localDay) return a.localDay - b.localDay
    return a.localStart.localeCompare(b.localStart)
  })

  // Transform Recurring para a Timezone do Professor
  const localRecurring = (recurring || []).map(req => {
    const startObj = utcToLocalTime(req.day_of_week, req.start_time, userTz)
    const endObj = utcToLocalTime(req.day_of_week, req.end_time, userTz)
    return {
      ...req,
      localDay: startObj.localDay,
      localStart: startObj.localTime,
      localEnd: endObj.localTime
    }
  }).sort((a,b) => {
    if (a.localDay !== b.localDay) return a.localDay - b.localDay
    return a.localStart.localeCompare(b.localStart)
  })

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '1000px' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <Link href="/admin" style={{ color: 'var(--text-muted)', textDecoration: 'underline', marginBottom: '1rem', display: 'inline-block' }}>
          &larr; Voltar ao Painel
        </Link>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Configuração de Expediente</h2>
        <p style={{ color: 'var(--text-muted)' }}>Defina suas horas de disponibilidade para aulas.</p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        {/* EXPEDIENTE BASE */}
        <section className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-main)' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Meu Expediente Semanal</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              Defina os blocos de horários em que você está online para receber agendamentos.
            </p>
          </div>
          
          <div style={{ padding: '1.5rem' }}>
            <AvailabilityForm />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '1rem' }}>DIA DA SEMANA</th>
                  <th style={{ padding: '1rem' }}>INÍCIO</th>
                  <th style={{ padding: '1rem' }}>FIM</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {localAvail?.map((av, index) => {
                  const isSameDayAsPrevious = index > 0 && localAvail[index-1].localDay === av.localDay;
                  return (
                    <tr key={av.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem', fontWeight: isSameDayAsPrevious ? 400 : 600 }}>
                        {isSameDayAsPrevious ? <span style={{ color: 'var(--text-muted)', paddingLeft: '1rem' }}>↳ bloco extra</span> : diasSemana[av.localDay]}
                      </td>
                      <td style={{ padding: '1rem' }}>{av.localStart}</td>
                      <td style={{ padding: '1rem' }}>{av.localEnd}</td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <form action={async () => {
                          'use server'
                          const { removeAvailability } = await import('./actions')
                          await removeAvailability(av.id)
                        }}>
                          <button type="submit" style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '0.85rem' }}>Remover</button>
                        </form>
                      </td>
                    </tr>
                  )
                })}
                {(!localAvail || localAvail.length === 0) && (
                  <tr><td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum horário de expediente cadastrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* AULAS FIXAS (READING ONLY) */}
        <section className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-main)' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Alunos com Horário Fixo</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              Estes são os horários que os próprios alunos escolheram como recorrentes.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '1rem' }}>ALUNO</th>
                  <th style={{ padding: '1rem' }}>DIA</th>
                  <th style={{ padding: '1rem' }}>HORÁRIO</th>
                </tr>
              </thead>
              <tbody>
                {localRecurring?.map(req => {
                  const studentProf = req.student as any
                  return (
                    <tr key={req.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>{studentProf?.full_name}</td>
                      <td style={{ padding: '1rem' }}>{diasSemana[req.localDay]}</td>
                      <td style={{ padding: '1rem' }}>{req.localStart} - {req.localEnd}</td>
                    </tr>
                  )
                })}
                {(!localRecurring || localRecurring.length === 0) && (
                  <tr><td colSpan={3} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhuma aula fixa vinculada no momento.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
