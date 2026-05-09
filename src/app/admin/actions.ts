'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'



export async function changeUserRole(
  targetUserId: string,
  newRole: 'student' | 'admin' | 'admin_master' | 'suporte' | 'dev'
) {

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('[changeUserRole] Usuário não autenticado')
    return
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const executorRole = profile?.role


  // Somente admin_master ou dev podem alterar cargos
  if (executorRole !== 'admin_master' && executorRole !== 'dev') {
    console.warn('[changeUserRole] Acesso negado: executor não é master nem dev.')
    return
  }

  // Somente dev pode promover para dev ou admin_master
  if ((newRole === 'dev' || newRole === 'admin_master') && executorRole !== 'dev') {
    console.warn('[changeUserRole] Acesso negado: apenas dev pode promover para dev/admin_master.')
    return
  }

  // Proteger contas dev: somente outro dev pode alterar
  const { data: target } = await supabase.from('profiles').select('role').eq('id', targetUserId).single()
  if (target?.role === 'dev' && executorRole !== 'dev') {
    console.warn('[changeUserRole] Acesso negado: apenas dev pode alterar outro dev.')
    return
  }

  // Utiliza a RPC para garantir o promotion_bypass e evitar o bloqueio da trigger protect_profile_fields
  const { error } = await supabase.rpc('promote_user_role', {
    target_user_id: targetUserId,
    new_role: newRole
  })

  if (error) {
    console.error('[Action: changeUserRole] Erro:', error)
    throw new Error(error.message)
  }

  revalidatePath('/admin/profile')
}

/**
 * Atualiza manualmente o status e a data de vencimento de uma assinatura.
 * Registra o histórico da alteração para auditoria.
 */
export async function updateSubscriptionManual(
  studentId: string,
  status: 'active' | 'inactive',
  endDate: string | null,
  notes?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin_master' && profile?.role !== 'dev') throw new Error('Acesso restrito')

  // 1. Buscar estado atual para o log
  const { data: currentSub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle()

  // 2. Atualizar assinatura
  // Regra futura: bloquear ativação sem idioma definido
  if (status === 'active') {
    const { data: studentProf } = await supabase.from('profiles').select('student_language').eq('id', studentId).single()
    if (!studentProf?.student_language) {
      throw new Error('Defina o idioma do aluno antes de ativar o plano.')
    }
  }

  const payload = {
    student_id: studentId,
    status,
    end_date: endDate || null,
    notes: notes || null,
    updated_at: new Date().toISOString()
  }

  let updateError
  if (currentSub) {
    const { error } = await supabase.from('subscriptions').update(payload).eq('student_id', studentId)
    updateError = error
  } else {
    const { error } = await supabase.from('subscriptions').insert(payload)
    updateError = error
  }

  if (updateError) {
    console.error('[Action: updateSubscriptionManual] Erro ao salvar sub:', updateError)
    throw updateError
  }

  // FIX: Sincroniza ativamente a permissão de painel/roteamento
  const { error: profileError } = await supabase.from('profiles').update({ is_active: status === 'active' }).eq('id', studentId)
  if (profileError) {
    console.error('[Action: updateSubscriptionManual] Erro ao sincronizar is_active:', profileError)
  }

  // 3. Gerar Log de Alteração
  if (currentSub) {
    await supabase.from('subscription_change_logs').insert({
      subscription_id: currentSub.id,
      admin_id: user.id,
      old_status: currentSub.status,
      new_status: status,
      old_end_date: currentSub.end_date,
      new_end_date: endDate,
      notes: notes || 'Ajuste manual via Admin Master'
    })
  }


  revalidatePath('/admin/profile')
}

/**
 * Alterna o status da assinatura e registra no histórico.
 */
export async function toggleSubscriptionStatus(studentId: string, currentStatus: string) {

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.warn('[toggleSubscriptionStatus] Não autenticado')
    return
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()


  // Somente ADMIN ou ADMIN MASTER podem alternar status
  const isAuthorized = profile?.role === 'admin' || profile?.role === 'admin_master' || profile?.role === 'suporte' || profile?.role === 'dev'
  if (!isAuthorized) {
    console.warn('[toggleSubscriptionStatus] Acesso negado')
    return
  }

  const newStatus = currentStatus === 'active' ? 'inactive' : 'active'


  // Regra: bloquear ativação sem idioma definido
  if (newStatus === 'active') {
    const { data: studentProf } = await supabase.from('profiles').select('student_language').eq('id', studentId).single()
    if (!studentProf?.student_language) {
      console.warn(`[toggleSubscriptionStatus] Bloqueado: Aluno ${studentId} sem idioma definido.`)
      return { error: 'Defina o idioma do aluno (Inglês/Espanhol) antes de liberar o acesso.' }
    }
  }

  const { data: currentSub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle()

  const payload = {
    student_id: studentId,
    status: newStatus,
    updated_at: new Date().toISOString()
  }

  let subError
  if (currentSub) {
    const { error } = await supabase.from('subscriptions').update(payload).eq('student_id', studentId)
    subError = error
  } else {
    const { error } = await supabase.from('subscriptions').insert(payload)
    subError = error
  }

  if (subError) {
    console.error('[toggleSubscriptionStatus] Erro ao atualizar/inserir subscriptions:', subError)
    return { error: 'Database error: ' + subError.message }
  }

  // FIX: Sincroniza ativamente a permissão da plataforma
  const { error: profError } = await supabase.from('profiles').update({ is_active: newStatus === 'active' }).eq('id', studentId)
  if (profError) {
    console.error('[toggleSubscriptionStatus] Erro ao sincronizar profiles.is_active:', profError)
  }

  // Gerar Log se houver assinatura prévia
  if (currentSub) {
    await supabase.from('subscription_change_logs').insert({
      subscription_id: currentSub.id,
      admin_id: user.id,
      old_status: currentStatus,
      new_status: newStatus,
      old_end_date: currentSub.end_date,
      new_end_date: currentSub.end_date,
      notes: `Toggle rápido via Admin para ${newStatus}`
    })
  }


  revalidatePath('/admin/profile')
}

/**
 * Define o idioma que um professor leciona.
 * Apenas admin_master pode alterar.
 */
export async function setTeacherLanguage(teacherId: string, language: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin_master' && profile?.role !== 'dev') return

  await supabase.from('profiles').update({ language: language || null }).eq('id', teacherId)
  revalidatePath('/admin/profile')
}

/**
 * Define o idioma do aluno (determina quais professores ele pode ver/agendar).
 * Admin ou admin_master podem definir.
 */
export async function setStudentLanguage(studentId: string, language: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin' || profile?.role === 'admin_master' || profile?.role === 'suporte' || profile?.role === 'dev'
  if (!isAdmin) return

  await supabase.from('profiles').update({ student_language: language || null }).eq('id', studentId)
  revalidatePath('/admin/profile')
}


export async function deleteUserAccount(targetUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin_master' && profile?.role !== 'dev') return { error: 'Acesso restrito' }

  // Proteger contas dev de exclusão por não-dev
  const { data: targetProf } = await supabase.from('profiles').select('role').eq('id', targetUserId).single()
  if (targetProf?.role === 'dev' && profile?.role !== 'dev') return { error: 'Apenas dev pode excluir conta de outro dev.' }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return { error: 'Chave de serviço ausente no ambiente.' }

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    // 1. Limpeza segura preditiva com Service Key (Master bypasses RLS) para evitar 'Database error deleting user'
    // O erro 'Database error deleting user' vem do GoTrue falhando frente a Foreign Keys sem ON DELETE CASCADE na DB.

    // A: Agenda (participação como aluno ou como professor)
    await supabaseAdmin.from('appointments').delete().or(`student_id.eq.${targetUserId},teacher_id.eq.${targetUserId}`)
    await supabaseAdmin.from('recurring_classes').delete().or(`student_id.eq.${targetUserId},teacher_id.eq.${targetUserId}`)

    // B: Mensagens
    await supabaseAdmin.from('messages').delete().or(`sender_id.eq.${targetUserId},receiver_id.eq.${targetUserId}`)

    // C: Assinaturas e Logs
    await supabaseAdmin.from('subscription_change_logs').delete().eq('admin_id', targetUserId)
    await supabaseAdmin.from('subscriptions').delete().eq('student_id', targetUserId)

    // D: Deletar objetos do storage atrelados a ele (se houver, impede deletar conta)
    const { data: targetProfile } = await supabaseAdmin.from('profiles').select('avatar_url').eq('id', targetUserId).single()
    if (targetProfile?.avatar_url) {
      const fileName = targetProfile.avatar_url.split('/').pop()
      if (fileName) {
        await supabaseAdmin.storage.from('avatars').remove([`${targetUserId}/${fileName}`])
        await supabaseAdmin.storage.from('avatars').remove([fileName]) // fallback se não tiver folder
      }
    }

    // E: Finalmente remover Perfil e o Auth do DB.
    await supabaseAdmin.from('profiles').delete().eq('id', targetUserId)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(targetUserId)

    if (error) return { error: error.message }

    revalidatePath('/admin/profile')
    return { success: true }
  } catch (err: any) {
    return { error: 'Erro grave: ' + err.message }
  }
}

/**
 * Salva as configurações de PIX estático na tabela settings.
 * Apenas admin_master pode alterar.
 */
export async function updatePixConfig(data: {
  pix_key: string | null
  pix_key_type: string | null
  pix_beneficiary_name: string | null
  pix_qr_code_url: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin_master' && profile?.role !== 'dev') return { error: 'Acesso restrito' }

  // Busca o id da row de settings (pode ser que exista apenas uma)
  const { data: existing } = await supabase.from('settings').select('id').maybeSingle()

  const payload = {
    pix_key: data.pix_key || null,
    pix_key_type: data.pix_key_type || null,
    pix_beneficiary_name: data.pix_beneficiary_name || null,
    pix_qr_code_url: data.pix_qr_code_url || null,
    updated_at: new Date().toISOString(),
  }

  let error
  if (existing?.id) {
    ;({ error } = await supabase.from('settings').update(payload).eq('id', existing.id))
  } else {
    ;({ error } = await supabase.from('settings').insert(payload))
  }

  if (error) return { error: error.message }
  revalidatePath('/admin/profile')
  return { success: true }
}
