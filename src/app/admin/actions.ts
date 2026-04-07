'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'



export async function changeUserRole(targetUserId: string, newRole: 'student' | 'admin') {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  // Somente ADMIN MASTER pode promover ou rebaixar membros
  if (profile?.role !== 'admin_master') return

  await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', targetUserId)

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
  if (profile?.role !== 'admin_master') throw new Error('Acesso restrito')

  // 1. Buscar estado atual para o log
  const { data: currentSub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('student_id', studentId)
    .single()

  // 2. Atualizar assinatura
  const { error } = await supabase
    .from('subscriptions')
    .update({ 
      status, 
      end_date: endDate || null,
      notes: notes || null,
      updated_at: new Date().toISOString()
    })
    .eq('student_id', studentId)

  if (error) throw error

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
  if (!user) return
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  
  // Somente ADMIN ou ADMIN MASTER podem alternar status
  const isAuthorized = profile?.role === 'admin' || profile?.role === 'admin_master'
  if (!isAuthorized) return

  const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
  
  const { data: currentSub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('student_id', studentId)
    .single()

  await supabase.from('subscriptions').update({ status: newStatus }).eq('student_id', studentId)

  // Gerar Log
  if (currentSub) {
    await supabase.from('subscription_change_logs').insert({
      subscription_id: currentSub.id,
      admin_id: user.id,
      old_status: currentStatus,
      new_status: newStatus,
      old_end_date: currentSub.end_date,
      new_end_date: currentSub.end_date,
      notes: `Toggle rápido para ${newStatus === 'active' ? 'Ativo' : 'Inativo'}`
    })
  }

  revalidatePath('/admin/profile')
}

/**
 * Atualiza as informações de contato do próprio administrador.
 */
export async function updateAdminProfile(fullName: string, whatsapp: string, instagram: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      whatsapp_number: whatsapp || null,
      instagram_handle: instagram || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)

  if (error) throw error
  revalidatePath('/admin/profile')
}
