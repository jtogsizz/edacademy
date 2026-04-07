'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Agenda uma aula extra consumindo 1 crédito de reposição.
 */
export async function bookSlot(startTimeISO: string, endTimeISO: string, teacherId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  // 1. Validar assinatura ativa primariamente
  const { data: subscription } = await supabase.from('subscriptions').select('status').eq('student_id', user.id).single()
  if (subscription?.status !== 'active') return { error: 'Sua conta está inativa. Renove para agendar aulas.' }

  // 2. Tratar concorrência do horário (se alguém marcou entre o clique e o processamento)
  const { data: conflict } = await supabase
    .from('appointments')
    .select('id')
    .eq('teacher_id', teacherId)
    .eq('start_time', startTimeISO)
    .eq('status', 'scheduled')
    .single()

  if (conflict) {
    return { error: 'Desculpe, este horário acabou de ser reservado por outro aluno.' }
  }

  // 3. Consumo ATÔMICO de crédito no Banco
  // Isso evita race conditions e créditos negativos
  const { data: consumed, error: rpcError } = await supabase.rpc('consume_replacement_credit', { 
    student_uuid: user.id 
  })

  if (rpcError || !consumed) {
    return { error: 'Saldo insuficiente ou erro ao processar créditos de reposição.' }
  }

  // 4. Efetivar o agendamento
  const { error: insertError } = await supabase.from('appointments').insert({
    student_id: user.id,
    teacher_id: teacherId,
    start_time: startTimeISO,
    end_time: endTimeISO,
    status: 'scheduled'
  })

  if (insertError) {
    // Estorno de segurança: se o insert falhar, devolvemos o crédito
    const { data: prof } = await supabase.from('profiles').select('replacement_credits').eq('id', user.id).maybeSingle()
    await supabase.from('profiles').update({ replacement_credits: (prof?.replacement_credits || 0) + 1 }).eq('id', user.id)
    return { error: 'Erro ao salvar agendamento. Seu crédito foi estornado.' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/schedule')
  revalidatePath('/dashboard/profile')
  return { success: true }
}

/**
 * Remarca uma aula (válido apenas para reposições/extras ou reagendamentos diretos)
 * Não consome crédito pois é uma troca de horário.
 */
export async function rescheduleAppointment(appointmentId: string, newStartTimeISO: string, newEndTimeISO: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  // 0. Validar assinatura ativa
  const { data: subscription } = await supabase.from('subscriptions').select('status').eq('student_id', user.id).single()
  if (subscription?.status !== 'active') return { error: 'Sua conta está inativa. Renove para reagendar aulas.' }

  // 1. Verificar se a aula é do usuário
  const { data: apt } = await supabase.from('appointments').select('*').eq('id', appointmentId).maybeSingle()
  if (apt?.student_id !== user.id) return { error: 'Acesso negado' }

  const { data: sub } = await supabase.from('subscriptions').select('end_date').eq('student_id', user.id).maybeSingle()
  
  // 2. Validar se a nova data é antes do vencimento
  if (sub?.end_date) {
    const newDate = new Date(newStartTimeISO)
    const expiry = new Date(sub.end_date)
    if (newDate > expiry) {
      return { error: 'A aula de reposição deve ser marcada antes do vencimento do seu plano.' }
    }
  }

  // 3. Atualizar a aula existente
  const { error } = await supabase
    .from('appointments')
    .update({ 
      start_time: newStartTimeISO, 
      end_time: newEndTimeISO,
      status: 'scheduled',
      updated_at: new Date().toISOString()
    })
    .eq('id', appointmentId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/schedule')
  revalidatePath('/dashboard/profile')
  return { success: true }
}

/**
 * Busca o template semanal de disponibilidade de um professor.
 */
export async function getTeacherAvailabilityTemplate(teacherId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { data: availability } = await supabase
    .from('teacher_availability')
    .select('*')
    .eq('teacher_id', teacherId)

  const { data: recurring } = await supabase
    .from('recurring_classes')
    .select('*')
    .eq('teacher_id', teacherId)

  if (!availability || !recurring) return { error: 'Erro ao buscar disponibilidade' }

  const { getTeacherWeeklyTemplate } = await import('./ScheduleEngine')
  const template = getTeacherWeeklyTemplate(availability, recurring, user.id)

  return { data: template }
}

/**
 * Adiciona uma aula fixa recorrente.
 */
export async function addRecurringClass(dayOfWeek: number, startTime: string, teacherId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  // 0. Validar assinatura ativa
  const { data: subscription } = await supabase.from('subscriptions').select('status').eq('student_id', user.id).single()
  if (subscription?.status !== 'active') return { error: 'Sua conta está inativa. Renove para agendar aulas.' }

  // 1. Validar limite do plano
  const { count } = await supabase
    .from('recurring_classes')
    .select('*', { count: 'exact' })
    .eq('student_id', user.id)

  if (count && count >= 1) {
    return { error: 'Limite de plano atingido: Máximo 1 horário fixo ativo.' }
  }

  // 2. Validar conflito
  const startTimeSec = `${startTime}:00`
  const { data: conflict } = await supabase
    .from('recurring_classes')
    .select('id')
    .eq('teacher_id', teacherId)
    .eq('day_of_week', dayOfWeek)
    .eq('start_time', startTimeSec)
    .single()

  if (conflict) {
    return { error: 'Este horário já foi preenchido por outro aluno.' }
  }

  // 3. Validar se professor trabalha nesse horário
  const { data: avails } = await supabase
    .from('teacher_availability')
    .select('*')
    .eq('teacher_id', teacherId)
    .eq('day_of_week', dayOfWeek)

  let isWithinAvailability = false
  if (avails) {
    for (const av of avails) {
      if (startTime >= av.start_time.substring(0, 5) && startTime < av.end_time.substring(0, 5)) {
        isWithinAvailability = true
        break
      }
    }
  }

  if (!isWithinAvailability) {
    return { error: 'O professor não está disponível neste horário.' }
  }

  const [h, m] = startTime.split(':').map(Number)
  const endHour = (h + 1).toString().padStart(2, '0')
  const endTime = `${endHour}:${m.toString().padStart(2, '0')}:00`

  const { error } = await supabase.from('recurring_classes').insert({
    student_id: user.id,
    teacher_id: teacherId,
    day_of_week: dayOfWeek,
    start_time: startTimeSec,
    end_time: endTime
  })

  if (error) return { error: error.message }
  
  revalidatePath('/dashboard/profile')
  return { success: true }
}

/**
 * Remove uma aula fixa recorrente.
 */
export async function removeRecurringClass(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { error } = await supabase.from('recurring_classes').delete().eq('id', id).eq('student_id', user.id)
  if (error) return { error: error.message }
  
  revalidatePath('/dashboard/profile')
  return { success: true }
}

/**
 * Cancela uma aula específica pelo professor, gerando crédito ao aluno.
 */
export async function cancelAppointmentByTeacher(id: string, reason: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  // Verificar se o usuário é Admin/Teacher
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAnyAdmin = profile?.role === 'admin' || profile?.role === 'admin_master'
  if (!isAnyAdmin) return { error: 'Apenas professores podem cancelar aulas.' }

  const { data: apt } = await supabase.from('appointments').select('*').eq('id', id).single()
  if (!apt) return { error: 'Aula não encontrada' }

  // Marcar como cancelada e registrar motivo
  const { error } = await supabase
    .from('appointments')
    .update({ 
      status: 'cancelled', 
      cancellation_reason: reason, 
      cancelled_by: user.id 
    })
    .eq('id', id)

  if (error) return { error: error.message }

  // Conceder crédito de reposição
  if (apt.student_id) {
    const { data: studentProfile } = await supabase.from('profiles').select('replacement_credits').eq('id', apt.student_id).single()
    await supabase.from('profiles').update({ replacement_credits: (studentProfile?.replacement_credits || 0) + 1 }).eq('id', apt.student_id)
  }

  revalidatePath('/admin/agenda')
  revalidatePath('/dashboard/profile')
  return { success: true }
}

/**
 * Cancela um dia inteiro para o professor, gerando créditos a todos afetados.
 */
export async function cancelDayByTeacher(dateISO: string, reason: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  // Verificar se o usuário é Admin/Teacher
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAnyAdmin = profile?.role === 'admin' || profile?.role === 'admin_master'
  if (!isAnyAdmin) return { error: 'Apenas professores podem cancelar um dia de aulas.' }

  const targetDate = new Date(dateISO)
  const dayOfWeek = targetDate.getDay()
  const startOfDay = new Date(targetDate); startOfDay.setHours(0,0,0,0)
  const endOfDay = new Date(targetDate); endOfDay.setHours(23,59,59,999)

  // A. Cancelar agendamentos pontuais
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('teacher_id', user.id)
    .gte('start_time', startOfDay.toISOString())
    .lte('start_time', endOfDay.toISOString())
    .eq('status', 'scheduled')

  const processedStudents = new Set<string>()

  if (appointments) {
    for (const apt of appointments) {
      await cancelAppointmentByTeacher(apt.id, reason)
      processedStudents.add(apt.student_id)
    }
  }

  // B. Cancelar recorrências do dia
  const { data: recurring } = await supabase
    .from('recurring_classes')
    .select('*')
    .eq('teacher_id', user.id)
    .eq('day_of_week', dayOfWeek)

  if (recurring) {
    for (const rec of recurring) {
      if (processedStudents.has(rec.student_id)) continue

      const [sh, sm] = rec.start_time.split(':').map(Number)
      const istart = new Date(targetDate); istart.setHours(sh, sm, 0, 0)
      const [eh, em] = rec.end_time.split(':').map(Number)
      const iend = new Date(targetDate); iend.setHours(eh, em, 0, 0)

      await supabase.from('appointments').insert({
        student_id: rec.student_id,
        teacher_id: user.id,
        start_time: istart.toISOString(),
        end_time: iend.toISOString(),
        status: 'cancelled',
        cancellation_reason: reason,
        cancelled_by: user.id
      })

      const { data: p } = await supabase.from('profiles').select('replacement_credits').eq('id', rec.student_id).single()
      await supabase.from('profiles').update({ replacement_credits: (p?.replacement_credits || 0) + 1 }).eq('id', rec.student_id)
    }
  }

  revalidatePath('/admin/agenda')
  revalidatePath('/dashboard/profile')
  return { success: true }
}
