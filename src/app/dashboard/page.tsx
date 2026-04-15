import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Feed from '@/components/Feed'
import LogoutButton from '@/components/LogoutButton'
import NotificationBell from '@/components/NotificationBell'

export default async function DashboardFeedPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  
  if (profile?.role === 'admin' || profile?.role === 'admin_master') {
    redirect('/admin')
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2>Feed</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Acompanhe as novidades e avisos.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <NotificationBell href="/dashboard/notifications" />
          <LogoutButton />
        </div>
      </header>

      <Feed isAdmin={false} />
    </div>
  )
}
