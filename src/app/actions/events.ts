'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkRateLimit, RATE_LIMIT_MESSAGES } from '@/utils/rate-limit'

// ─── PERMISSÕES ────────────────────────────────────────────
const STAFF_ROLES = ['admin', 'admin_master', 'suporte', 'dev']

// ─── CRIAR EVENTO ──────────────────────────────────────────
export async function createEvent(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!STAFF_ROLES.includes(profile?.role)) {
    return { error: 'Apenas professores e equipe podem criar eventos.' }
  }

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const teacher_id = formData.get('teacher_id') as string
  const start_time = formData.get('start_time') as string
  const end_time = formData.get('end_time') as string
  const max_participants = parseInt(formData.get('max_participants') as string, 10)
  const is_public = formData.get('is_public') === 'true'

  if (!title || !start_time || !end_time || !teacher_id) {
    return { error: 'Preencha todos os campos obrigatórios.' }
  }
  if (max_participants < 5 || max_participants > 20) {
    return { error: 'O limite de participantes deve ser entre 5 e 20.' }
  }
  if (new Date(start_time) >= new Date(end_time)) {
    return { error: 'O horário de início deve ser antes do término.' }
  }

  const { error } = await supabase.from('events').insert({
    title, description, teacher_id, start_time, end_time,
    max_participants, is_public, created_by: user.id,
  })
  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/admin')
  revalidatePath('/eventos')
  return { success: true }
}

// ─── PARTICIPAR DO EVENTO ───────────────────────────────────
export async function joinEvent(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  // Rate limit: 10 inscrições em eventos por 10 minutos por usuário
  const { limited } = await checkRateLimit('join_event', user.id)
  if (limited) return { error: RATE_LIMIT_MESSAGES.join_event }

  // Verifica que o evento existe e está aberto
  const { data: event } = await supabase
    .from('events')
    .select('*, event_participants(student_id)')
    .eq('id', eventId)
    .single()

  if (!event) return { error: 'Evento não encontrado.' }
  if (event.status === 'cancelled') return { error: 'Este evento foi cancelado.' }

  const alreadyIn = event.event_participants.some((p: any) => p.student_id === user.id)
  if (alreadyIn) return { error: 'Você já está participando deste evento.' }

  if (event.event_participants.length >= event.max_participants) {
    return { error: 'Evento lotado.' }
  }

  // Verificar conflito com appointment pontual no mesmo horário
  const { data: conflictApt } = await supabase
    .from('appointments')
    .select(`
      id, start_time, end_time,
      teacher:profiles!appointments_teacher_id_fkey(full_name)
    `)
    .eq('student_id', user.id)
    .eq('status', 'scheduled')
    .gte('start_time', event.start_time)
    .lt('start_time', event.end_time)
    .maybeSingle()

  // Verificar conflito com aula recorrente no mesmo dia/hora
  const eventStart = new Date(event.start_time)
  const dayOfWeek = eventStart.getUTCDay()
  const hh = String(eventStart.getUTCHours()).padStart(2, '0')
  const mm = String(eventStart.getUTCMinutes()).padStart(2, '0')
  const timeStr = `${hh}:${mm}:00`

  const { data: conflictRec } = await supabase
    .from('recurring_classes')
    .select(`
      id, start_time, day_of_week,
      teacher:profiles!recurring_classes_teacher_id_fkey(full_name)
    `)
    .eq('student_id', user.id)
    .eq('day_of_week', dayOfWeek)
    .eq('start_time', timeStr)
    .maybeSingle()

  if (conflictApt || conflictRec) {
    const conflict = (conflictApt || conflictRec)!
    return {
      conflict: true,
      conflictType: conflictApt ? 'appointment' : 'recurring',
      conflictId: conflict.id,
      conflictTeacher: (conflict as any).teacher?.full_name,
      conflictTime: conflictApt
        ? new Date(conflictApt.start_time).toISOString()
        : event.start_time,
    }
  }

  // Sem conflito: entrar no evento via RPC atômica
  const { error: rpcError } = await supabase.rpc('join_public_event', { p_event_id: eventId })
  if (rpcError) return { error: rpcError.message }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/minhas-aulas')
  revalidatePath('/eventos')
  revalidatePath('/meus-eventos')
  return { success: true }
}

// ─── PARTICIPAR SOBRESCREVENDO CONFLITO ────────────────────
export async function joinEventOverridingConflict(
  eventId: string,
  conflictAppointmentId: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  // Rate limit compartilhado com joinEvent (mesmo recurso: vaga em evento)
  const { limited } = await checkRateLimit('join_event', user.id)
  if (limited) return { error: RATE_LIMIT_MESSAGES.join_event }

  // Cancelar o appointment conflitante (segurança: só pode cancelar o próprio)
  const { error: cancelErr } = await supabase
    .from('appointments')
    .update({ status: 'cancelled', cancellation_reason: 'Aluno optou por participar de evento' })
    .eq('id', conflictAppointmentId)
    .eq('student_id', user.id)

  if (cancelErr) return { error: cancelErr.message }

  // Devolver crédito de reposição via RPC atômica (bypass seguro da trigger protect_profile_fields)
  const { error: creditErr } = await supabase.rpc('add_replacement_credit', { student_uuid: user.id })
  if (creditErr) {
    // Loga o erro mas não bloqueia o fluxo — o cancelamento já ocorreu
    console.error('[joinEventOverridingConflict] Erro ao estornar crédito:', creditErr.message)
  }

  // Entrar no evento via RPC atômica
  const { error: rpcError } = await supabase.rpc('join_public_event', { p_event_id: eventId })
  if (rpcError) return { error: rpcError.message }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/minhas-aulas')
  revalidatePath('/eventos')
  revalidatePath('/meus-eventos')
  return { success: true }
}

// ─── CANCELAR EVENTO (STAFF) ───────────────────────────────
export async function cancelEvent(eventId: string, reason?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!STAFF_ROLES.includes(profile?.role)) {
    return { error: 'Sem permissão para cancelar eventos.' }
  }

  const { error } = await supabase
    .from('events')
    .update({ status: 'cancelled', cancellation_reason: reason || null })
    .eq('id', eventId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/admin')
  return { success: true }
}
