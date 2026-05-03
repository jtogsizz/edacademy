import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import MasterGrid from './MasterGrid'

export default async function MasterAgendaPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, timezone').eq('id', user.id).single()
  if (profile?.role !== 'admin_master' && profile?.role !== 'dev') {
    redirect('/dashboard') // Segurança dupla
  }

  // Obter todos professores
  const { data: teachers } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('role', ['admin', 'admin_master'])
    .order('full_name')

  const userTimezone = profile?.timezone || 'America/Sao_Paulo'

  return (
    <div className="container" style={{ paddingTop: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Planilha de Aulas</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Mapeamento global e auditoria em tempo real da agenda de todos os professores.</p>
      </div>

      <MasterGrid teachers={teachers || []} initialTimezone={userTimezone} />
    </div>
  )
}
