'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function completeOnboarding(fullName: string, whatsapp: string, timezone: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  // Exigência: aluno/usuário salva esses 3 campos. Não permitimos envio de is_active, role etc.
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      whatsapp_number: whatsapp,
      timezone: timezone,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)

  if (error) return { error: error.message }
  
  // Como as regras mudam após o preenchimento, revalidamos raiz
  revalidatePath('/dashboard', 'layout')
  revalidatePath('/admin', 'layout')
  
  return { success: true }
}
