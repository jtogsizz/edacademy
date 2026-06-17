'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

interface NotificationBellClientProps {
  href: string
  initialCount: number
  userId: string
}

export default function NotificationBellClient({ href, initialCount, userId }: NotificationBellClientProps) {
  const [unreadCount, setUnreadCount] = useState(initialCount)

  useEffect(() => {
    // Update count if initialCount changes (e.g. Server Component re-renders after a Server Action)
    setUnreadCount(initialCount)
  }, [initialCount])

  useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    let isMounted = true

    // Polling function
    const fetchUnreadCount = async () => {
      try {
        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('read', false)
          .not('metadata->>type', 'eq', 'credits_empty')

        if (!error && count !== null && isMounted) {
          setUnreadCount(count)
        }
      } catch (err) {
        console.error('[NotificationBellClient] Erro ao buscar contagem de notificações:', err)
      }
    }

    // Set up polling (e.g., every 30 seconds)
    const intervalId = setInterval(fetchUnreadCount, 30000)

    // Optional: Also set up Supabase Realtime for instant updates if the table has realtime enabled
    const channel = supabase
      .channel(`notifications-bell-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        () => {
          // Whenever there's a change to this user's notifications, fetch the new count
          fetchUnreadCount()
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      clearInterval(intervalId)
      supabase.removeChannel(channel)
    }
  }, [userId])

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
