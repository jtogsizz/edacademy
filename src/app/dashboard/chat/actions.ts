'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkRateLimit, RATE_LIMIT_MESSAGES } from '@/utils/rate-limit'

export async function sendMessageToAdmin(adminId: string, content: string, type: 'text' | 'emoji' = 'text') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // se deslogou ou admin sumiu manda o caô
  if (!user) return { error: 'Não autorizado' }
  if (!adminId) return { error: 'Faltou indicar o Professor.' }

  // Rate limit: 60 mensagens por minuto por usuário
  const { limited } = await checkRateLimit('chat', user.id)
  if (limited) return { error: RATE_LIMIT_MESSAGES.chat }

  // poe a fofoca no banco
  const { error } = await supabase.from('messages').insert({
    sender_id: user.id,
    receiver_id: adminId,
    content,
    msg_type: type
  })

  // deu zebra
  if (error) return { error: error.message }
  
  // forçando pro next parar de cachear essa bosta de chat
  revalidatePath('/dashboard/chat')
  revalidatePath(`/dashboard/chat/${adminId}`)
  
  return { success: true }
}

