'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

/** Marca uma notificação específica como lida */
export async function markNotificationAsRead(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
    .eq('user_id', user.id)   // RLS + extra safety: só atualiza o próprio

  revalidatePath('/dashboard/notifications')
  revalidatePath('/admin/notifications')
  return { success: true }
}

/** Marca todas as notificações do usuário como lidas */
export async function markAllNotificationsAsRead() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false)

  revalidatePath('/dashboard/notifications')
  revalidatePath('/admin/notifications')
  return { success: true }
}
