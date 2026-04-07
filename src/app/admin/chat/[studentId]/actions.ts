'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function sendMessageToStudent(studentId: string, content: string, type: 'text' | 'emoji' = 'text') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'admin_master') return { error: 'Não autorizado' }

  const { error } = await supabase.from('messages').insert({
    sender_id: user.id,
    receiver_id: studentId,
    content,
    msg_type: type
  })

  if (error) return { error: error.message }

  revalidatePath(`/admin/chat/${studentId}`)
  return { success: true }
}
