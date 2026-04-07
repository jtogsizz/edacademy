'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Cria um novo post no feed.
 * Apenas admins e admin_master podem postar.
 */
export async function createPost(content: string, imageUrl: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { error: 'Não autorizado' }
  
  // Verificar permissão
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'admin_master') {
    return { error: 'Apenas professores podem publicar no feed.' }
  }
  
  const { error } = await supabase.from('posts').insert({
    user_id: user.id,
    content,
    image_url: imageUrl
  })
  
  if (error) return { error: error.message }
  
  revalidatePath('/dashboard')
  revalidatePath('/admin')
  return { success: true }
}

/**
 * Atualiza o avatar_url no perfil do usuário.
 */
export async function updateProfileAvatar(avatarUrl: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { error: 'Não autorizado' }
  
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id)
  
  if (error) return { error: error.message }
  
  revalidatePath('/dashboard/profile')
  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Atualiza informações de contato do próprio usuário (nome, whatsapp, instagram).
 * Funciona para Alunos e Admins.
 */
export async function updateProfile(fullName: string, whatsapp: string, instagram?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      whatsapp_number: whatsapp || null,
      instagram_handle: instagram || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)

  if (error) return { error: error.message }
  
  revalidatePath('/dashboard/profile')
  revalidatePath('/admin/profile')
  return { success: true }
}


