import Feed from '@/components/Feed'
import NotificationBell from '@/components/NotificationBell'
import LogoutButton from '@/components/LogoutButton'
import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'

export default async function AdminDashboardView({ user, profile, clientTz }: any) {
  const userTz = profile?.timezone || clientTz || 'America/Sao_Paulo'
  const now = new Date()

  const firstName = profile?.full_name?.split(' ')[0] || 'Professor'
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="container" style={{ padding: '1.5rem 1.5rem', paddingBottom: '6rem', maxWidth: '1100px' }}>
      {/* ── Header ── */}
      <header className="internal-header" style={{ marginBottom: '2rem' }}>
        <div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
            {greeting}, {firstName} 👋
          </p>
          <h1 className="internal-title">Dashboard</h1>
          <p className="internal-subtitle">
            {formatInTimeZone(now, userTz, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="internal-header-actions">
          <NotificationBell href="/admin/notifications" />
          <LogoutButton />
        </div>
      </header>

      {/* ── Feed ── */}
      <Feed isAdmin={true} />
    </div>
  )
}
