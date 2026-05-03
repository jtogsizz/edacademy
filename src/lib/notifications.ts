/**
 * src/lib/notifications.ts
 * Utilitário servidor para criar notificações.
 * Usa service role key para bypass de RLS (inserções de cross-user).
 */
import { createClient } from '@supabase/supabase-js'

export type NotificationType =
  | 'class_cancelled'
  | 'class_rescheduled'
  | 'payment_due'
  | 'system'
  | 'system_alert'

export const NOTIF_ICONS: Record<NotificationType | string, string> = {
  class_cancelled:  '🚫',
  class_rescheduled: '🔄',
  payment_due:      '💰',
  system:           '🔔',
  system_alert:     '🚨',
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

export async function createNotification(params: {
  userId: string
  type: NotificationType
  title: string
  body?: string
  metadata?: Record<string, unknown>
}) {
  // Fire-and-forget — nunca bloqueia o fluxo principal
  try {
    const supabase = getServiceClient()
    const { error } = await supabase.from('notifications').insert({
      user_id:  params.userId,
      type:     params.type,
      title:    params.title,
      body:     params.body ?? null,
      metadata: params.metadata ?? {},
    })
    if (error) console.error('[createNotification]', error.message)
  } catch (err: any) {
    console.error('[createNotification] unexpected:', err.message)
  }
}
