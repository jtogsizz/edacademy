'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function registerWithEmail(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const full_name = formData.get('full_name') as string
  const whatsapp_number = formData.get('whatsapp_number') as string
  const timezone = formData.get('timezone') as string
  const event_id = formData.get('event_id') as string

  if (!email || !password || !full_name || !whatsapp_number) {
    return { error: 'Preencha todos os campos obrigatórios.' }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        whatsapp_number,
        timezone,
        event_id: event_id || null
      }
    }
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true, user: data.user }
}
