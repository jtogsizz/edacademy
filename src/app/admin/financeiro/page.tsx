import { createClient, createAdminClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import InternalPageHeader from '@/components/InternalPageHeader'
import NotificationBell from '@/components/NotificationBell'
import LogoutButton from '@/components/LogoutButton'
import FinanceiroClient from './FinanceiroClient'

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
  const currentYear = today.getFullYear()
  
  // ── Parallel queries ──────────────────────────────────────────
  const [
    { data: allSubs },
    { data: allStudentProfiles },
    { data: transactions },
  ] = await Promise.all([
    supabase.from('subscriptions').select('student_id, status, plan_type, end_date'),
    supabase.from('profiles').select('id, full_name, role, is_active, replacement_credits, student_language').eq('role', 'student'),
    supabase.from('financial_transactions').select('amount, reference_month').eq('reference_year', currentYear),
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

  // ── Prepare groups ──────────────────────────────────────────
  const subs = allSubs ?? []
  
  const pendingIds = subs.filter(s => s.status === 'pending_confirmation').map(s => s.student_id)
  const activeIds  = subs.filter(s => s.status === 'active').map(s => s.student_id)
  const overdueIds = subs.filter(s => s.status !== 'active' && s.status !== 'pending_confirmation').map(s => s.student_id)

  const pendingStudents = pendingIds.map(id => {
    const prof = studentMap.get(id)
    const sub  = subs.find(s => s.student_id === id)
    return prof ? { ...prof, end_date: sub?.end_date, status: sub?.status, plan_type: sub?.plan_type } : null
  }).filter(Boolean)

  const activeStudents = activeIds.map(id => {
    const prof = studentMap.get(id)
    const sub  = subs.find(s => s.student_id === id)
    return prof ? { ...prof, end_date: sub?.end_date, status: sub?.status, plan_type: sub?.plan_type } : null
  }).filter(Boolean)

  const overdueStudents = overdueIds.map(id => {
    const prof = studentMap.get(id)
    const sub  = subs.find(s => s.student_id === id)
    return prof ? { ...prof, end_date: sub?.end_date, status: sub?.status, plan_type: sub?.plan_type } : null
  }).filter(Boolean)

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

      <div className="section-label" style={{ marginBottom: '1rem', marginTop: '1rem' }}>
        Resumo Anual ({currentYear})
      </div>
      
      <FinanceiroClient
        pending={pendingStudents as any}
        active={activeStudents as any}
        overdue={overdueStudents as any}
        transactions={transactions ?? []}
      />
    </div>
  )
}
