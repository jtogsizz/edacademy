'use server'

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkRateLimit, RATE_LIMIT_MESSAGES } from '@/utils/rate-limit'

/**
 * Cria um novo post no feed.
 * Apenas admins e admin_master podem postar.
 */
export async function createPost(content: string, imageUrl: string | null, eventData?: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { error: 'Não autorizado' }

  // Rate limit: 10 posts por minuto por usuário
  const { limited } = await checkRateLimit('post', user.id)
  if (limited) return { error: RATE_LIMIT_MESSAGES.post }
  
  // Verificar permissão
  const STAFF_ROLES = ['admin', 'admin_master', 'suporte', 'dev']
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  
  if (!profile || !STAFF_ROLES.includes(profile.role)) {
    return { error: 'Apenas professores e staff podem publicar no feed.' }
  }
  
  let eventId = null
  
  // Se houver dados de evento, cria o evento primeiro
  if (eventData) {
    const { title, teacher_id, start_time, end_time, max_participants, meet_url, is_public } = eventData
    
    // Validação básica de URL
    if (meet_url && !meet_url.startsWith('https://')) {
      return { error: 'O link da reunião deve começar com https://' }
    }

    const { data: ev, error: evError } = await supabase.from('events').insert({
      title,
      teacher_id,
      start_time,
      end_time,
      max_participants,
      is_public: Boolean(is_public),
      meet_url: meet_url || null,
      created_by: user.id
    }).select('id').single()
    
    if (evError) return { error: evError.message }
    eventId = ev.id
  }

  const { error } = await supabase.from('posts').insert({
    user_id: user.id,
    content,
    image_url: imageUrl,
    event_id: eventId
  })
  
  if (error) return { error: error.message }
  
  revalidatePath('/dashboard')
  revalidatePath('/admin')
  revalidatePath('/')
  return { success: true }
}

/**
 * Atualiza o conteúdo de um post no feed.
 * Apenas o autor do post pode editá-lo.
 */
export async function updatePost(postId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { error: 'Não autorizado' }
  
  const { data: post } = await supabase.from('posts').select('user_id').eq('id', postId).single()
  if (!post || post.user_id !== user.id) {
    return { error: 'Você não tem permissão para editar este post.' }
  }
  
  const { error } = await supabase.from('posts').update({ 
    content,
  }).eq('id', postId)
  
  if (error) return { error: error.message }
  
  revalidatePath('/dashboard')
  revalidatePath('/admin')
  return { success: true }
}

/**
 * Exclui um post do feed.
 * Apenas o autor do post pode excluí-lo.
 */
export async function deletePost(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { error: 'Não autorizado' }
  
  const { data: post } = await supabase.from('posts').select('user_id').eq('id', postId).single()
  if (!post || post.user_id !== user.id) {
    return { error: 'Você não tem permissão para excluir este post.' }
  }
  
  const { error } = await supabase.from('posts').delete().eq('id', postId)
  
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
    .update({ 
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString() 
    })
    .eq('id', user.id)
  
  if (error) return { error: error.message }
  
  revalidatePath('/dashboard/profile')
  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Atualiza informações de contato do próprio usuário.
 * Alunos: Apenas full_name, whatsapp_number e timezone.
 * Admins: IDK, podem editar instagram também.
 */
export async function updateProfile(fullName: string, whatsapp: string, instagram?: string, timezone?: string, language?: string, meetUrl?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  // 1. Identifica a role do usuário
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  
  // payload seguro limitado àquelas 3 chaves para estudantes
  const updatePayload: any = {
    full_name: fullName,
    whatsapp_number: whatsapp || null,
    timezone: timezone || null,
    updated_at: new Date().toISOString()
  }

  // Apenas admins podem ter o instagram e idioma guardado no updateProfile
  if (profile?.role === 'admin' || profile?.role === 'admin_master') {
    updatePayload.instagram_handle = instagram || null
    updatePayload.language = language || null
    
    // Validação de URL do Meet
    if (meetUrl && !meetUrl.startsWith('https://')) {
      return { error: 'O link do Google Meet deve começar com https://' }
    }
    updatePayload.meet_url = meetUrl || null
  }

  const { error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', user.id)

  if (error) return { error: error.message }
  
  revalidatePath('/dashboard/profile')
  revalidatePath('/admin/profile')
  return { success: true }
}
/**
 * Alterna a curtida em um post.
 */
export async function toggleLike(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  // 1. Verificar se já curtiu
  const { data: existing } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    // Descurtir
    const { error } = await supabase.from('post_likes').delete().eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    // Curtir
    const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id })
    if (error) return { error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Adiciona um comentário a um post.
 */
export async function addComment(postId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }
  if (!content.trim()) return { error: 'Conteúdo vazio' }

  // Rate limit: 20 comentários por minuto por usuário
  const { limited } = await checkRateLimit('comment', user.id)
  if (limited) return { error: RATE_LIMIT_MESSAGES.comment }

  const { error } = await supabase.from('post_comments').insert({
    post_id: postId,
    user_id: user.id,
    content: content.trim()
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Marca o pagamento do aluno como pending_confirmation.
 */
export async function markPaymentPending() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  // 1. Buscar a assinatura atual do aluno
  const { data: sub, error: fetchErr } = await supabase
    .from('subscriptions')
    .select('status, end_date')
    .eq('student_id', user.id)
    .single()

  if (fetchErr && fetchErr.code !== 'PGRST116') {
    return { error: 'Erro ao buscar assinatura.' }
  }

  // DEBUG LOG
  console.log('[DEBUG markPaymentPending] user_id:', user.id)
  console.log('[DEBUG markPaymentPending] sub found:', sub)

  // 2. Validação de regras de negócio
  if (sub) {
    if (sub.status === 'pending_confirmation') {
      console.log('[DEBUG markPaymentPending] Bloqueado: Já pendente')
      return { success: false }
    }

    if (sub.status === 'active') {
      if (!sub.end_date) {
        console.log('[DEBUG markPaymentPending] Bloqueado: Ativa sem end_date')
        return { error: 'Assinatura ativa não possui data de vencimento.' }
      }
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const expiry = new Date(sub.end_date)
      expiry.setHours(0, 0, 0, 0)
      const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      console.log('[DEBUG markPaymentPending] diasRestantes:', daysUntilExpiry)

      if (daysUntilExpiry > 7) {
        console.log('[DEBUG markPaymentPending] Bloqueado: > 7 dias')
        return { error: 'O plano ainda tem mais de 7 dias de validade.' }
      }
    }
  }

  // 3. Atualizar ou inserir sem usar upsert
  const adminClient = await createAdminClient()
  if (sub) {
    // Atualizar registro existente
    console.log('[DEBUG markPaymentPending] Executando update...')
    const { error, count } = await adminClient
      .from('subscriptions')
      .update({ 
        status: 'pending_confirmation',
        updated_at: new Date().toISOString()
      })
      .eq('student_id', user.id)
      .select()

    console.log('[DEBUG markPaymentPending] update result:', { error, count: count || (error ? null : 'sucesso, select retornou dados') })

    if (error) return { error: error.message }
  } else {
    // Inserir novo registro se não existia
    console.log('[DEBUG markPaymentPending] Executando insert...')
    const { error } = await adminClient
      .from('subscriptions')
      .insert({ 
        student_id: user.id,
        status: 'pending_confirmation',
        updated_at: new Date().toISOString()
      })

    if (error) {
      console.log('[DEBUG markPaymentPending] Insert error:', error.message)
      return { error: error.message }
    }
  }

  // Verificar update real no banco (sanity check)
  const { data: finalSub } = await adminClient
    .from('subscriptions')
    .select('status')
    .eq('student_id', user.id)
    .single()

  console.log('[DEBUG markPaymentPending] status após update:', finalSub?.status)

  if (finalSub?.status !== 'pending_confirmation') {
    return { error: 'Falha ao atualizar o status no banco de dados. Tente novamente.' }
  }

  revalidatePath('/dashboard/profile')
  revalidatePath('/dashboard')
  revalidatePath('/admin/financeiro')
  return { success: true }
}

/**
 * Salva as preferências de UI do usuário (tema e idioma).
 */
export async function saveUserPreferences(theme: string, locale: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { error } = await supabase
    .from('profiles')
    .update({ ui_theme: theme, ui_locale: locale })
    .eq('id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}
