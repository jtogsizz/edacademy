import { createClient, createAdminClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import InternalPageHeader from '@/components/InternalPageHeader'
import NotificationBell from '@/components/NotificationBell'
import LogoutButton from '@/components/LogoutButton'
import FinanceiroClient from './FinanceiroClient'
import { calcMonthlyRevenue, formatBRL } from '@/utils/pricing'

// Apenas admin_master, suporte e dev podem acessar
const FINANCEIRO_ROLES = ['admin_master', 'suporte', 'dev']

export const metadata = { title: 'Painel Financeiro · EdAcademy' }

// SVG Icons inline (sem dependência extra)
function Icon({ d, color = 'currentColor' }: { d: string; color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

export default async function FinanceiroPage() {
  noStore()
  const supabase = await createClient()

  // ── Auth + Role Guard ──────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !FINANCEIRO_ROLES.includes(profile.role)) {
    redirect('/admin')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayISO = today.toISOString()
  const in7 = new Date(today); in7.setDate(in7.getDate() + 7)
  const in7ISO = in7.toISOString()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
  const monthEnd   = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString()

  // ── Parallel queries ──────────────────────────────────────────
  const [
    { data: allSubs },
    { data: allStudentProfiles },
    { data: allAdmins },
    { data: operationalAlerts },
  ] = await Promise.all([
    supabase.from('subscriptions').select('student_id, status, plan_type, end_date'),
    supabase.from('profiles').select('id, full_name, role, is_active, replacement_credits, student_language').eq('role', 'student'),
    supabase.from('profiles').select('id').in('role', ['admin', 'admin_master']),
    supabase.from('notifications')
      .select('id, type, message, created_at, metadata')
      .in('type', ['fixed_class_removed', 'availability_removed', 'event_low_slots'])
      .gte('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  // ── Enrich student profiles with emails via admin client ──────
  let studentMap: Map<string, any> = new Map()
  try {
    const adminClient = await createAdminClient()
    const { data: authUsers } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
    const emailMap = new Map(authUsers?.users?.map(u => [u.id, u.email]) ?? [])
    for (const s of allStudentProfiles ?? []) {
      studentMap.set(s.id, { ...s, email: emailMap.get(s.id) ?? null })
    }
  } catch {
    for (const s of allStudentProfiles ?? []) {
      studentMap.set(s.id, s)
    }
  }

  // ── KPI calculations ──────────────────────────────────────────
  const subs = allSubs ?? []
  const activeSubs   = subs.filter(s => s.status === 'active')
  const inactiveSubs = subs.filter(s => s.status !== 'active')

  // Vencidos: active mas end_date < today
  const expiredSubIds = activeSubs
    .filter(s => s.end_date && new Date(s.end_date) < today)
    .map(s => s.student_id)


  const monthlyRevenue = calcMonthlyRevenue(subs)

  // Alunos ativos/inativos por is_active
  const activeStudents   = (allStudentProfiles ?? []).filter(s => s.is_active === true)
  const inactiveStudents = (allStudentProfiles ?? []).filter(s => s.is_active === false)


  // ── Prepare table data ────────────────────────────────────────
  const expiredStudentList = expiredSubIds
    .map(id => {
      const prof = studentMap.get(id)
      const sub  = subs.find(s => s.student_id === id)
      return prof ? { ...prof, end_date: sub?.end_date, status: sub?.status, plan_type: sub?.plan_type } : null
    })
    .filter(Boolean)


  const kpis = [
    {
      label: 'Alunos ativos',
      value: activeStudents.length,
    },
    {
      label: 'Alunos inativos',
      value: inactiveStudents.length,
    },
    {
      label: 'Receita mensal est.',
      value: formatBRL(monthlyRevenue),
    },
    {
      label: 'Assinaturas vencidas',
      value: expiredSubIds.length,
    },

    {
      label: 'Professores',
      value: (allAdmins ?? []).length,
    },
  ]

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', paddingBottom: '6rem', maxWidth: '1280px' }}>

      <InternalPageHeader
        title="Painel Financeiro"
        subtitle="Visão operacional e financeira da plataforma"
        breadcrumb={[
          { label: 'Admin', href: '/admin' },
          { label: 'Financeiro' },
        ]}
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <NotificationBell href="/admin/notifications" />
            <LogoutButton />
          </div>
        }
      />

      {/* ── KPI Cards ── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            style={{
              flex: '1 1 calc(33.333% - 1rem)',
              minWidth: '220px',
              maxWidth: '350px',
              background: '#FFFFFF',
              border: '1px solid rgba(229, 231, 235, 0.8)',
              borderRadius: '8px',
              padding: '1.25rem 1.5rem',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#111827', marginTop: '0.4rem', lineHeight: 1 }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) {
          div[style*="flex: 1 1 calc(33.333% - 1rem)"] {
            flex: 1 1 calc(50% - 1rem) !important;
          }
        }
        @media (max-width: 480px) {
          div[style*="flex: 1 1 calc(33.333% - 1rem)"] {
            flex: 1 1 100% !important;
          }
        }
      `}} />

      {/* ── Tabelas detalhadas (client component com tabs) ── */}
      <div className="section-label" style={{ marginBottom: '1rem' }}>
        Detalhe operacional
      </div>

      <FinanceiroClient
        expiredStudents={expiredStudentList as any}
        operationalAlerts={(operationalAlerts ?? []) as any}
      />
    </div>
  )
}
