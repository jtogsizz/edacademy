"use server"

import { createClient } from '@/utils/supabase/server'

export async function updateUserTimezone(timezone: string) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Apenas atualizar o timezone do profile deste usuário
    const { error } = await supabase
      .from('profiles')
      .update({ timezone: timezone })
      .eq('id', session.user.id)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error("Erro ao atualizar timezone:", error)
    return { success: false, error: error.message }
  }
}
