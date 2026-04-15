/**
 * NotificationBell — Server Component
 * Busca a contagem de notificações não lidas do usuário logado
 * e exibe um sino com badge. Link direto para a página de notificações.
 */
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export default async function NotificationBell({ href }: { href: string }) {
  let unreadCount = 0

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)
      unreadCount = count ?? 0
    }
  } catch {
    // Tabela pode não existir ainda — falha silenciosa para não quebrar o dashboard
    unreadCount = 0
  }

  const displayCount = unreadCount > 99 ? '99+' : unreadCount

  return (
    <Link
      href={href}
      aria-label={`Notificações${unreadCount > 0 ? ` — ${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : ''}`}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: 'var(--bg-main)',
        border: '1px solid var(--border)',
        color: unreadCount > 0 ? 'var(--primary)' : 'var(--text-muted)',
        textDecoration: 'none',
        transition: 'all 0.2s ease',
        flexShrink: 0,
      }}
    >
      {/* Sino SVG */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={unreadCount > 0 ? 2.5 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>

      {/* Badge */}
      {unreadCount > 0 && (
        <span
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            minWidth: '18px',
            height: '18px',
            padding: '0 4px',
            borderRadius: '99px',
            backgroundColor: 'var(--primary)',
            color: '#fff',
            fontSize: '0.65rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            border: '2px solid var(--bg-card)',
            letterSpacing: '-0.01em',
          }}
        >
          {displayCount}
        </span>
      )}
    </Link>
  )
}
