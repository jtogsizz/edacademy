import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import MarkAllReadButton from './MarkAllReadButton'
import { markNotificationAsRead } from './actions'

export const metadata = { title: 'Notificações' }

const TYPE_ICONS: Record<string, string> = {
  class_cancelled:   '🚫',
  class_rescheduled: '🔄',
  payment_due:       '💰',
  system:            '🔔',
}

export default async function NotificationsPage() {
  noStore()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  // Admins têm página própria
  if (profile?.role === 'admin' || profile?.role === 'admin_master' || profile?.role === 'suporte' || profile?.role === 'dev') redirect('/admin/notifications')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    // Notificações do tipo credits_empty foram removidas da lógica de negócio.
    // Registros antigos permanecem no banco mas não devem aparecer para o aluno.
    .not('metadata->>type', 'eq', 'credits_empty')
    .order('created_at', { ascending: false })
    .limit(100)

  const unreadCount = (notifications || []).filter(n => !n.read).length

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', paddingBottom: '6rem', maxWidth: '700px' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.2rem' }}>Notificações</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Tudo em dia!'}
          </p>
        </div>
        <MarkAllReadButton disabled={unreadCount === 0} />
      </header>

      {/* Lista */}
      {notifications && notifications.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {notifications.map(notif => {
            const icon = TYPE_ICONS[notif.type] ?? '🔔'
            const timeAgo = formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: ptBR })

            return (
              <form
                key={notif.id}
                action={async () => {
                  'use server'
                  await markNotificationAsRead(notif.id)
                }}
              >
                <button
                  type="submit"
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: notif.read ? 'default' : 'pointer' }}
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
                    transition: 'box-shadow 0.2s',
                  }}>
                    {/* Icon */}
                    <span style={{ fontSize: '1.4rem', flexShrink: 0, lineHeight: 1.3 }}>{icon}</span>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{
                          fontWeight: notif.read ? 500 : 700,
                          color: notif.read ? 'var(--text-main)' : 'var(--primary)',
                          fontSize: '0.95rem',
                        }}>
                          {notif.title}
                        </span>
                        {!notif.read && (
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)', marginTop: '5px', flexShrink: 0 }} />
                        )}
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
          <h3 style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Nenhuma notificação ainda</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Você verá avisos sobre suas aulas aqui.
          </p>
        </div>
      )}
    </div>
  )
}
