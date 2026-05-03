import { createClient } from '@/utils/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import MarkAllReadButton from '@/app/dashboard/notifications/MarkAllReadButton'
import { markNotificationAsRead } from '@/app/dashboard/notifications/actions'

export const metadata = { title: 'Notificações' }

const TYPE_ICONS: Record<string, string> = {
  class_cancelled: '🚫',
  class_rescheduled: '🔄',
  payment_due: '💰',
  system: '🔔',
}

const TYPE_LABELS: Record<string, string> = {
  class_cancelled: 'Aula cancelada',
  class_rescheduled: 'Remarcação',
  payment_due: 'Pagamento',
  system: 'Sistema',
}

export default async function AdminNotificationsPage() {
  noStore()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'admin_master' && profile?.role !== 'suporte' && profile?.role !== 'dev') redirect('/dashboard')

  const isAdminMaster = profile?.role === 'admin_master'

  let notifications: any[] = []

  if (isAdminMaster) {
    // admin_master vê TODAS as notificações (qualquer usuário) — usa service client
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )
    const { data } = await serviceClient
      .from('notifications')
      .select('*, user:profiles!notifications_user_id_fkey(full_name, role)')
      .order('created_at', { ascending: false })
      .limit(200)
    notifications = data || []
  } else {
    // admin/professor vê só as próprias
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)
    notifications = data || []
  }

  const unreadCount = notifications.filter(n => !n.read && (isAdminMaster || n.user_id === user.id)).length
  const myUnreadCount = notifications.filter(n => !n.read && n.user_id === user.id).length

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', paddingBottom: '6rem', maxWidth: '800px' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.2rem' }}>Notificações</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {isAdminMaster
              ? `${notifications.length} notificação${notifications.length !== 1 ? 's' : ''} (todas as contas)`
              : myUnreadCount > 0 ? `${myUnreadCount} não lida${myUnreadCount > 1 ? 's' : ''}` : 'Tudo em dia!'}
          </p>
        </div>
        <MarkAllReadButton disabled={myUnreadCount === 0} />
      </header>

      {/* Lista */}
      {notifications.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {notifications.map(notif => {
            const icon = TYPE_ICONS[notif.type] ?? '🔔'
            const typeLabel = TYPE_LABELS[notif.type] ?? notif.type
            const timeAgo = formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: ptBR })
            const isOwnNotif = notif.user_id === user.id
            const userName = notif.user?.full_name

            return (
              <form
                key={notif.id}
                action={async () => {
                  'use server'
                  if (isOwnNotif) await markNotificationAsRead(notif.id)
                }}
              >
                <button
                  type={isOwnNotif && !notif.read ? 'submit' : 'button'}
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: isOwnNotif && !notif.read ? 'pointer' : 'default' }}
                >
                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'flex-start',
                    padding: '1.1rem 1.25rem',
                    backgroundColor: notif.read ? 'var(--bg-card)' : 'rgba(var(--primary-rgb, 99, 102, 241), 0.06)',
                    border: `1px solid ${notif.read ? 'var(--border)' : 'rgba(var(--primary-rgb, 99, 102, 241), 0.2)'}`,
                    borderRadius: 'var(--radius-md)',
                    borderLeft: notif.read ? '1px solid var(--border)' : '4px solid var(--primary)',
                  }}>
                    <span style={{ fontSize: '1.4rem', flexShrink: 0, lineHeight: 1.3 }}>{icon}</span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <div>
                          {/* Para admin_master: mostrar de quem é */}
                          {isAdminMaster && userName && (
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
                              → {userName}
                            </div>
                          )}
                          <span style={{
                            fontWeight: notif.read ? 500 : 700,
                            color: notif.read ? 'var(--text-main)' : 'var(--primary)',
                            fontSize: '0.95rem',
                          }}>
                            {notif.title}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                          <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '99px', backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontWeight: 600 }}>
                            {typeLabel}
                          </span>
                          {!notif.read && (
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)', flexShrink: 0 }} />
                          )}
                        </div>
                      </div>
                      {notif.body && (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem', lineHeight: 1.5 }}>
                          {notif.body}
                        </p>
                      )}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem', display: 'block' }}>
                        {timeAgo}
                      </span>
                    </div>
                  </div>
                </button>
              </form>
            )
          })}
        </div>
      ) : (
        <div style={{
          padding: '4rem 2rem',
          textAlign: 'center',
          backgroundColor: 'var(--bg-card)',
          border: '1px dashed var(--border)',
          borderRadius: 'var(--radius-lg)',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔔</div>
          <h3 style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Nenhuma notificação</h3>
        </div>
      )}
    </div>
  )
}
