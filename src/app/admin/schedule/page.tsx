import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { utcToLocalTime } from '@/utils/agendaUtils'
import { AvailabilityForm } from './AdminConfigForms'
import { RemoveAvailabilityButton } from './RemoveAvailabilityButton'

const DIAS = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
]

// Ícones SVG inline para zero dependências
function IconClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}
function IconTrash() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
}
function IconUser() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

export default async function AdminSchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const cookieStore = await cookies()
  const clientTz = cookieStore.get('client_tz')?.value

  const { data: profile } = await supabase.from('profiles').select('role, timezone').eq('id', user.id).single()
  const allowedRoles = ['admin', 'admin_master', 'suporte', 'dev']
  if (!allowedRoles.includes(profile?.role)) redirect('/dashboard')

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

  // Transform para a Timezone do Professor
  const localAvail = (availability || []).map(av => {
    const startObj = utcToLocalTime(av.day_of_week, av.start_time, userTz)
    const endObj = utcToLocalTime(av.day_of_week, av.end_time, userTz)
    return { ...av, localDay: startObj.localDay, localStart: startObj.localTime, localEnd: endObj.localTime }
  }).sort((a, b) => a.localDay !== b.localDay ? a.localDay - b.localDay : a.localStart.localeCompare(b.localStart))

  const localRecurring = (recurring || []).map(req => {
    const startObj = utcToLocalTime(req.day_of_week, req.start_time, userTz)
    const endObj = utcToLocalTime(req.day_of_week, req.end_time, userTz)
    return { ...req, localDay: startObj.localDay, localStart: startObj.localTime, localEnd: endObj.localTime }
  }).sort((a, b) => a.localDay !== b.localDay ? a.localDay - b.localDay : a.localStart.localeCompare(b.localStart))

  // Agrupar disponibilidade por dia
  const availByDay = new Map<number, typeof localAvail>()
  for (const av of localAvail) {
    if (!availByDay.has(av.localDay)) availByDay.set(av.localDay, [])
    availByDay.get(av.localDay)!.push(av)
  }

  // Agrupar aulas fixas por dia
  const recurringByDay = new Map<number, typeof localRecurring>()
  for (const r of localRecurring) {
    if (!recurringByDay.has(r.localDay)) recurringByDay.set(r.localDay, [])
    recurringByDay.get(r.localDay)!.push(r)
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1.5rem', paddingBottom: '6rem' }}>

      {/* ── HEADER ── */}
      <header style={{ marginBottom: '2.5rem' }}>
        <Link
          href="/admin"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            color: 'var(--text-muted)', fontSize: '0.82rem', textDecoration: 'none',
            marginBottom: '1.25rem', transition: 'color 0.15s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          Voltar ao Painel
        </Link>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
          Configuração de Expediente
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.4rem', fontSize: '0.9rem' }}>
          Defina os blocos de horário em que você está disponível para receber agendamentos.
        </p>
      </header>

      {/* ── CARD: ADICIONAR HORÁRIO ── */}
      <section style={{
        background: 'var(--bg-card, #fff)',
        border: '1.5px solid var(--border)',
        borderRadius: 16,
        padding: '1.75rem 2rem',
        marginBottom: '2rem',
        boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
      }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
            Adicionar bloco de horário
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.3rem' }}>
            Adicione mais de um bloco por dia para incluir pausas (ex: almoço).
          </p>
        </div>
        <AvailabilityForm />
      </section>

      {/* ── EXPEDIENTE ATUAL ── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
            Meu Expediente Semanal
          </h2>
          {localAvail.length > 0 && (
            <span style={{
              fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)',
              background: 'var(--bg-main)', border: '1px solid var(--border)',
              padding: '0.2rem 0.6rem', borderRadius: 99,
            }}>
              {localAvail.length} {localAvail.length === 1 ? 'bloco' : 'blocos'}
            </span>
          )}
        </div>

        {localAvail.length === 0 ? (
          <EmptyState
            icon="🗓"
            title="Nenhum horário cadastrado"
            sub="Adicione seu primeiro bloco de expediente usando o formulário acima."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Array.from(availByDay.entries()).map(([dayNum, slots]) => (
              <div key={dayNum} style={{
                background: 'var(--bg-card, #fff)',
                border: '1.5px solid var(--border)',
                borderRadius: 14,
                overflow: 'hidden',
                boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
                transition: 'box-shadow 0.15s',
              }}
              className="sched-day-card"
              >
                {/* Cabeçalho do dia */}
                <div style={{
                  padding: '0.75rem 1.25rem',
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--bg-main)',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{DIAS[dayNum]}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    {slots.length} {slots.length === 1 ? 'bloco' : 'blocos'}
                  </span>
                </div>

                {/* Slots do dia */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {slots.map((av, idx) => (
                    <div key={av.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.85rem 1.25rem',
                      borderBottom: idx < slots.length - 1 ? '1px dashed var(--border)' : 'none',
                      gap: '1rem',
                    }}>
                      {/* Horário */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <IconClock />
                        <span style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>
                          {av.localStart}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>→</span>
                        <span style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>
                          {av.localEnd}
                        </span>
                        {idx > 0 && (
                          <span style={{
                            fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem',
                            borderRadius: 99, background: 'rgba(234,88,12,0.08)',
                            color: 'var(--primary)', border: '1px solid rgba(234,88,12,0.15)',
                            letterSpacing: '0.04em', textTransform: 'uppercase',
                          }}>
                            Bloco extra
                          </span>
                        )}
                      </div>

                      {/* Remover */}
                      <RemoveAvailabilityButton
                        availabilityId={av.id}
                        displayTime={`${av.localStart} → ${av.localEnd}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── AULAS FIXAS (LEITURA) ── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
              Alunos com Horário Fixo
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
              Horários que os próprios alunos configuraram como recorrentes.
            </p>
          </div>
          {localRecurring.length > 0 && (
            <span style={{
              fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)',
              background: 'var(--bg-main)', border: '1px solid var(--border)',
              padding: '0.2rem 0.6rem', borderRadius: 99,
            }}>
              {localRecurring.length} {localRecurring.length === 1 ? 'aula' : 'aulas'}
            </span>
          )}
        </div>

        {localRecurring.length === 0 ? (
          <EmptyState
            icon="👥"
            title="Nenhuma aula fixa vinculada"
            sub="Quando alunos configurarem horários fixos com você, eles aparecerão aqui."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Array.from(recurringByDay.entries()).map(([dayNum, classes]) => (
              <div key={dayNum} style={{
                background: 'var(--bg-card, #fff)',
                border: '1.5px solid var(--border)',
                borderRadius: 14,
                overflow: 'hidden',
                boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
              }}
              className="sched-day-card"
              >
                {/* Cabeçalho do dia */}
                <div style={{
                  padding: '0.75rem 1.25rem',
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--bg-main)',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{DIAS[dayNum]}</span>
                </div>

                {/* Aulas do dia */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {classes.map((cls, idx) => {
                    const studentProf = cls.student as any
                    return (
                      <div key={cls.id} style={{
                        display: 'flex', alignItems: 'center', gap: '1rem',
                        padding: '0.85rem 1.25rem',
                        borderBottom: idx < classes.length - 1 ? '1px dashed var(--border)' : 'none',
                        flexWrap: 'wrap',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 140 }}>
                          <IconClock />
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', fontVariantNumeric: 'tabular-nums' }}>
                            {cls.localStart}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>→</span>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', fontVariantNumeric: 'tabular-nums' }}>
                            {cls.localEnd}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                          <IconUser />
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {studentProf?.full_name || 'Aluno'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <style dangerouslySetInnerHTML={{ __html: `
        .sched-day-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08) !important; }
        .sched-remove-btn:hover {
          background: rgba(220,38,38,0.07) !important;
          border-color: rgba(220,38,38,0.2) !important;
        }
        @media (max-width: 500px) {
          .sched-day-card > div > div { flex-wrap: wrap; gap: 0.5rem !important; }
        }
      `}} />
    </div>
  )
}

// ── Empty state component ────────────────────────────────────────────────────
function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '3rem 2rem', textAlign: 'center',
      background: 'var(--bg-card, #fff)',
      border: '1.5px dashed var(--border)',
      borderRadius: 14,
    }}>
      <span style={{ fontSize: '2.25rem', marginBottom: '0.75rem', lineHeight: 1 }}>{icon}</span>
      <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.4rem' }}>{title}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', maxWidth: 340 }}>{sub}</div>
    </div>
  )
}
