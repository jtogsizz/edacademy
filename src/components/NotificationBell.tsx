/**
 * NotificationBell — Server Component
 * Busca a contagem de notificações não lidas do usuário logado
 * e exibe um sino com badge. Link direto para a página de notificações.
 */
import { createClient } from '@/utils/supabase/server'
import NotificationBellClient from './NotificationBellClient'

export default async function NotificationBell({ href }: { href: string }) {
  let unreadCount = 0
  let userId = ''

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      userId = user.id
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)
        .not('metadata->>type', 'eq', 'credits_empty')
      unreadCount = count ?? 0
    }
  } catch {
    // Tabela pode não existir ainda — falha silenciosa para não quebrar o dashboard
    unreadCount = 0
  }

  // Se não tem user, exibe versão estática sem client side polling
  if (!userId) {
    return null
  }

  return (
    <NotificationBellClient 
      href={href} 
      initialCount={unreadCount} 
      userId={userId} 
    />
  )
}
