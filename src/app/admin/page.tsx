import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Feed from '@/components/Feed'
import LogoutButton from '@/components/LogoutButton'

export default async function AdminFeedPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  
  if (profile?.role !== 'admin' && profile?.role !== 'admin_master') {
    redirect('/dashboard')
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2>Feed Administrativo</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Crie publicações e gerencie suas aulas.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/admin/agenda" className="btn-primary" style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}>Minha Agenda</Link>
          <LogoutButton />
        </div>
      </header>

      <Feed isAdmin={true} />
    </div>
  )
}
