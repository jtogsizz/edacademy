'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { PLAN_PRICES } from '@/utils/pricing'
import { addPlanPeriod } from '@/utils/dateUtils'

// Role guard helper
async function requireFinanceAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin_master', 'suporte', 'dev'].includes(profile.role)) {
    throw new Error('Acesso restrito')
  }
  return user.id
}

export async function confirmPayment(studentId: string) {
  const supabase = await createClient()
  const adminId = await requireFinanceAdmin(supabase)

  const { data: currentSub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle()

  if (!currentSub) throw new Error('Assinatura não encontrada')
  if (currentSub.status !== 'pending_confirmation') {
    throw new Error('Assinatura não está aguardando confirmação.')
  }

  const now = new Date()
  const referenceMonth = now.getMonth() + 1
  const referenceYear = now.getFullYear()

  // Verificar duplicidade: um aluno só pode ter 1 transação válida por mês
  const { data: existingTx } = await supabase
    .from('financial_transactions')
    .select('id')
    .eq('student_id', studentId)
    .eq('reference_month', referenceMonth)
    .eq('reference_year', referenceYear)
    .maybeSingle()

  if (existingTx) {
    return { success: false, error: 'Este aluno já possui pagamento registrado neste mês.' }
  }

  let baseDate = new Date()

  // Se end_date ainda está no futuro, renova a partir dele (evita perda de dias).
  // Se vencida, renova a partir de hoje.
  if (currentSub.end_date) {
    const end = new Date(currentSub.end_date)
    if (end > now) {
      baseDate = end
    }
  }

  // Soma 1 período calendário conforme o tipo do plano
  const planType = currentSub.plan_type || 'mensal'
  const newEndDate = addPlanPeriod(baseDate, planType)
  const newEndDateStr = newEndDate.toISOString()

  // 1. Atualizar subscription
  const { error: subErr } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      end_date: newEndDateStr,
      updated_at: new Date().toISOString()
    })
    .eq('student_id', studentId)

  if (subErr) throw new Error('Erro ao atualizar assinatura: ' + subErr.message)

  // 2. Ativar profile
  const { error: profErr } = await supabase
    .from('profiles')
    .update({ is_active: true })
    .eq('id', studentId)

  if (profErr) console.error('[confirmPayment] Erro ao ativar perfil:', profErr.message)

  // 3. Registrar transação financeira
  const amount = PLAN_PRICES[planType] || 197

  const { error: txErr } = await supabase.from('financial_transactions').insert({
    student_id: studentId,
    subscription_id: currentSub.id,
    amount,
    type: 'manual_confirmation',
    confirmed_by: adminId,
    reference_month: referenceMonth,
    reference_year: referenceYear
  })

  if (txErr) console.error('[confirmPayment] Erro ao registrar transação:', txErr.message)

  // 4. Log
  await supabase.from('subscription_change_logs').insert({
    subscription_id: currentSub.id,
    admin_id: adminId,
    old_status: currentSub.status,
    new_status: 'active',
    old_end_date: currentSub.end_date,
    new_end_date: newEndDateStr,
    notes: `Pagamento confirmado. Assinatura renovada (plano: ${planType}).`
  })

  revalidatePath('/admin/financeiro')
  return { success: true }
}

export async function renewSubscription(studentId: string) {
  const supabase = await createClient()
  const adminId = await requireFinanceAdmin(supabase)

  const { data: currentSub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle()

  if (!currentSub) throw new Error('Assinatura não encontrada')

  const now = new Date()
  const referenceMonth = now.getMonth() + 1
  const referenceYear = now.getFullYear()

  // Verificar duplicidade: um aluno só pode ter 1 transação válida por mês
  // Substitui o antigo bloqueio de 5 minutos — agora a trava é pelo mês inteiro
  const { data: existingTx } = await supabase
    .from('financial_transactions')
    .select('id')
    .eq('student_id', studentId)
    .eq('reference_month', referenceMonth)
    .eq('reference_year', referenceYear)
    .maybeSingle()

  if (existingTx) {
    return { success: false, error: 'Este aluno já possui pagamento registrado neste mês.' }
  }

  let baseDate = new Date()
  if (currentSub.end_date) {
    const end = new Date(currentSub.end_date)
    if (end > now) baseDate = end
  }

  // Soma 1 período calendário conforme o tipo do plano
  const planType = currentSub.plan_type || 'mensal'
  const newEndDate = addPlanPeriod(baseDate, planType)
  const newEndDateStr = newEndDate.toISOString()

  // 1. Atualizar subscription
  const { error: subErr } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      end_date: newEndDateStr,
      updated_at: new Date().toISOString()
    })
    .eq('student_id', studentId)

  if (subErr) throw new Error('Erro ao renovar assinatura: ' + subErr.message)

  // 2. Ativar profile
  const { error: profErr } = await supabase
    .from('profiles')
    .update({ is_active: true })
    .eq('id', studentId)

  if (profErr) console.error('[renewSubscription] Erro ao ativar perfil:', profErr.message)

  // 3. Registrar transação financeira
  const amount = PLAN_PRICES[planType] || 197

  const { error: txErr } = await supabase.from('financial_transactions').insert({
    student_id: studentId,
    subscription_id: currentSub.id,
    amount,
    type: 'renewal',
    confirmed_by: adminId,
    reference_month: referenceMonth,
    reference_year: referenceYear
  })

  if (txErr) console.error('[renewSubscription] Erro ao registrar transação:', txErr.message)

  // 4. Log
  await supabase.from('subscription_change_logs').insert({
    subscription_id: currentSub.id,
    admin_id: adminId,
    old_status: currentSub.status,
    new_status: 'active',
    old_end_date: currentSub.end_date,
    new_end_date: newEndDateStr,
    notes: `Renovação manual de assinatura (plano: ${planType}).`
  })

  revalidatePath('/admin/financeiro')
  return { success: true }
}

export async function rejectPayment(studentId: string) {
  const supabase = await createClient()
  const adminId = await requireFinanceAdmin(supabase)

  const { data: currentSub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle()

  if (!currentSub) throw new Error('Assinatura não encontrada')

  // 1. Reverter para inactive
  const { error: subErr } = await supabase
    .from('subscriptions')
    .update({
      status: 'inactive',
      updated_at: new Date().toISOString()
    })
    .eq('student_id', studentId)

  if (subErr) throw new Error('Erro ao rejeitar: ' + subErr.message)

  // 2. Desativar profile
  await supabase
    .from('profiles')
    .update({ is_active: false })
    .eq('id', studentId)

  // 3. Log
  await supabase.from('subscription_change_logs').insert({
    subscription_id: currentSub.id,
    admin_id: adminId,
    old_status: currentSub.status,
    new_status: 'inactive',
    old_end_date: currentSub.end_date,
    new_end_date: currentSub.end_date,
    notes: 'Pagamento rejeitado/não confirmado.'
  })

  revalidatePath('/admin/financeiro')
  return { success: true }
}


export async function cancelPlan(studentId: string) {
  const supabase = await createClient()
  const adminId = await requireFinanceAdmin(supabase)

  const { data: currentSub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle()

  if (!currentSub) throw new Error('Assinatura não encontrada')

  // 1. Reverter para inactive
  const { error: subErr } = await supabase
    .from('subscriptions')
    .update({
      status: 'inactive',
      updated_at: new Date().toISOString()
    })
    .eq('student_id', studentId)

  if (subErr) throw new Error('Erro ao cancelar: ' + subErr.message)

  // 2. Desativar profile
  await supabase
    .from('profiles')
    .update({ is_active: false })
    .eq('id', studentId)

  // 3. Log
  await supabase.from('subscription_change_logs').insert({
    subscription_id: currentSub.id,
    admin_id: adminId,
    old_status: currentSub.status,
    new_status: 'inactive',
    old_end_date: currentSub.end_date,
    new_end_date: currentSub.end_date,
    notes: 'Plano cancelado manualmente via painel financeiro.'
  })

  revalidatePath('/admin/financeiro')
  return { success: true }
}
