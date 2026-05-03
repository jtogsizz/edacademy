'use server'

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { createNotification } from '@/lib/notifications'
import { checkRateLimit, RATE_LIMIT_MESSAGES } from '@/utils/rate-limit'

/**
 * Agenda uma aula extra consumindo 1 crédito de reposição.
 */
export async function bookSlot(startTimeISO: string, endTimeISO: string, teacherId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  // Rate limit: 5 agendamentos por 5 minutos por usuário
  const { limited } = await checkRateLimit('book_slot', user.id)
  if (limited) return { error: RATE_LIMIT_MESSAGES.book_slot }

  // 1. Validar assinatura ativa primariamente
  const { data: subscription } = await supabase.from('subscriptions').select('status').eq('student_id', user.id).single()
  if (subscription?.status !== 'active') return { error: 'Sua conta está inativa. Renove para agendar aulas.' }

  // 2. Validação de idioma (segurança backend)
  const { data: studentProf } = await supabase.from('profiles').select('student_language').eq('id', user.id).single()
  const { data: teacherProf } = await supabase.from('profiles').select('language').eq('id', teacherId).single()
  if (studentProf?.student_language && teacherProf?.language && studentProf.student_language !== teacherProf.language) {
    return { error: 'Você só pode agendar aulas com professores do seu idioma.' }
  }

  // 3. Verificar conflito em appointments
  const { data: apptConflict } = await supabase
    .from('appointments')
    .select('id')
    .eq('teacher_id', teacherId)
    .eq('start_time', startTimeISO)
    .eq('status', 'scheduled')
    .maybeSingle()

  if (apptConflict) {
    return { error: 'Desculpe, este horário acabou de ser reservado por outro aluno.' }
  }

  // 3b. Verificar conflito em aulas fixas recorrentes (← GAP ANTERIOR: causa do bug de duplo agendamento)
  const slotDate = new Date(startTimeISO)
  const slotDayOfWeek = slotDate.getUTCDay()
  const slotHH = slotDate.getUTCHours().toString().padStart(2, '0')
  const slotMM = slotDate.getUTCMinutes().toString().padStart(2, '0')
  const slotTimeStr = `${slotHH}:${slotMM}:00`

  const { data: recurringConflict } = await supabase
    .from('recurring_classes')
    .select('id, student_id')
    .eq('teacher_id', teacherId)
    .eq('day_of_week', slotDayOfWeek)
    .eq('start_time', slotTimeStr)
    .neq('student_id', user.id)
    .maybeSingle()

  if (recurringConflict) {
    return { error: 'Este horário está reservado como aula fixa de outro aluno.' }
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
    // Tratamento de erro de concorrência no nível do Banco (Exclusion Constraint)
    if (insertError.code === '23P01') {
      return { error: 'Desculpe, este horário acabou de ser reservado por outro aluno (conflito detectado no banco).' }
    }

    // Estorno de segurança: se o insert falhar por outro motivo, devolvemos o crédito via RPC atômica
    // (UPDATE direto seria bloqueado pela trigger protect_profile_fields)
    const { error: refundErr } = await supabase.rpc('add_replacement_credit', { student_uuid: user.id })
    if (refundErr) {
      console.error('[bookSlot] Erro ao estornar crédito após falha no insert:', refundErr.message)
      return { error: 'Erro ao salvar agendamento. Falha também ao estornar o crédito — entre em contato com o suporte.' }
    }
    return { error: 'Erro ao salvar agendamento. Seu crédito foi estornado.' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/schedule')
  revalidatePath('/dashboard/profile')
  return { success: true }
}

/**
 * Remarca uma aula.
 *
 * Dois fluxos:
 * - ID real (UUID): appointment pontual → UPDATE direto, sem crédito.
 * - ID sintético (rec-UUID-ISO): aula fixa do plano → troca de horário SEM crédito.
 *   Grava um appointment cancelado no slot original (override do ScheduleEngine)
 *   e cria um novo appointment no novo horário escolhido.
 */
export async function rescheduleAppointment(appointmentId: string, newStartTimeISO: string, newEndTimeISO: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  // 0. Validar assinatura ativa
  const { data: subscription } = await supabase.from('subscriptions').select('status').eq('student_id', user.id).maybeSingle()
  if (subscription?.status !== 'active') return { error: 'Sua conta está inativa. Renove para reagendar aulas.' }

  const { data: sub } = await supabase.from('subscriptions').select('end_date').eq('student_id', user.id).maybeSingle()

  if (sub?.end_date) {
    const newDate = new Date(newStartTimeISO)
    const expiry = new Date(sub.end_date)
    if (newDate > expiry) {
      return { error: 'A aula de reposição deve ser marcada antes do vencimento do seu plano.' }
    }
  }

  // Garantia extra: nunca permitir reagendar para data já passada
  if (new Date(newStartTimeISO) < new Date()) {
    return { error: 'Não é possível remarcar para uma data no passado.' }
  }

  // Aula fixa recorrente: ID sintético no formato rec-{recurringId}-{isoDate}
  if (appointmentId.startsWith('rec-')) {
    // partes: ['rec', seg1, seg2, seg3, seg4, seg5, ...ISO]
    const parts = appointmentId.split('-')
    const recurringId = parts.slice(1, 6).join('-')
    // O ISO do slot original vem após o UUID (índice 6 em diante)
    const originalSlotISO = parts.slice(6).join('-')

    const { data: rec } = await supabase
      .from('recurring_classes')
      .select('teacher_id, student_id, start_time, end_time')
      .eq('id', recurringId)
      .eq('student_id', user.id)
      .maybeSingle()

    if (!rec) return { error: 'Aula fixa não encontrada ou não pertence à sua conta.' }

    // Verificar conflito no novo horário — appointments
    const { data: apptConflict } = await supabase
      .from('appointments')
      .select('id')
      .eq('teacher_id', rec.teacher_id)
      .eq('start_time', newStartTimeISO)
      .eq('status', 'scheduled')
      .maybeSingle()

    if (apptConflict) return { error: 'Este horário já foi reservado por outro aluno.' }

    // Verificar conflito no novo horário — aulas fixas recorrentes
    const newSlot = new Date(newStartTimeISO)
    const newSlotDay = newSlot.getUTCDay()
    const newSlotHH = newSlot.getUTCHours().toString().padStart(2, '0')
    const newSlotMM = newSlot.getUTCMinutes().toString().padStart(2, '0')
    const newSlotTimeStr = `${newSlotHH}:${newSlotMM}:00`

    const { data: recurringStatus1 } = await supabase.rpc('get_teacher_recurring_status', { p_teacher_id: rec.teacher_id })
    const recConflict = recurringStatus1?.find((r: any) => 
       r.day_of_week === newSlotDay && 
       r.start_time === newSlotTimeStr && 
       r.is_occupied_by_other
    )

    if (recConflict) return { error: 'Este horário está reservado como aula fixa de outro aluno.' }

    // Registrar exceção de cancelamento para o slot original.
    // O ScheduleEngine trata appointment cancelled como override da recorrência (slot fica livre para outros).
    if (originalSlotISO) {
      const [sh, sm] = rec.start_time.split(':').map(Number)
      const [eh, em] = rec.end_time.split(':').map(Number)
      const origStart = new Date(originalSlotISO)
      origStart.setUTCHours(sh, sm, 0, 0)
      const origEnd = new Date(originalSlotISO)
      origEnd.setUTCHours(eh, em, 0, 0)

      await supabase.from('appointments').insert({
        student_id: user.id,
        teacher_id: rec.teacher_id,
        start_time: origStart.toISOString(),
        end_time: origEnd.toISOString(),
        status: 'cancelled',
        cancellation_reason: 'Remarcado pelo aluno'
      })
    }

    // Criar appointment no novo horário — sem consumo de crédito
    const { error: insertError } = await supabase.from('appointments').insert({
      student_id: user.id,
      teacher_id: rec.teacher_id,
      start_time: newStartTimeISO,
      end_time: newEndTimeISO,
      status: 'scheduled'
    })

    if (insertError) {
      if (insertError.code === '23P01') {
        return { error: 'Desculpe, o novo horário escolhido acabou de ser ocupado.' }
      }
      return { error: 'Erro ao salvar remarcação.' }
    }

    // Notificar professor sobre remarcação pelo aluno
    try {
      const { data: studentProf } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      const studentName = studentProf?.full_name || 'O aluno'
      const newDate = new Date(newStartTimeISO)
      const DIAS_PT = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado']
      const dayName = DIAS_PT[newDate.getUTCDay()]
      const timeStr = `${newDate.getUTCHours().toString().padStart(2,'0')}:${newDate.getUTCMinutes().toString().padStart(2,'0')}`
      await createNotification({
        userId: rec.teacher_id,
        type: 'class_rescheduled',
        title: 'Aluno remarcou uma aula',
        body: `${studentName} remarcou a aula para ${dayName} às ${timeStr}.`,
        metadata: { newStartTime: newStartTimeISO, studentId: user.id },
      })
    } catch {/* fire-and-forget */}

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/schedule')
    revalidatePath('/dashboard/profile')
    return { success: true }
  }

  // Appointment real: verificar ownership e fazer UPDATE
  const { data: apt, error: fetchError } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .eq('student_id', user.id)
    .maybeSingle()

  if (fetchError) return { error: 'Erro ao verificar agendamento.' }
  if (!apt) return { error: 'Agendamento não encontrado ou não pertence à sua conta.' }

  // Verificar conflito no novo horário — appointments
  const { data: apptConflictReal } = await supabase
    .from('appointments')
    .select('id')
    .eq('teacher_id', apt.teacher_id)
    .eq('start_time', newStartTimeISO)
    .eq('status', 'scheduled')
    .neq('id', appointmentId)
    .maybeSingle()

  if (apptConflictReal) return { error: 'Este horário já foi reservado por outro aluno.' }

  // Verificar conflito no novo horário — aulas fixas recorrentes
  const realSlot = new Date(newStartTimeISO)
  const realSlotDay = realSlot.getUTCDay()
  const realSlotHH = realSlot.getUTCHours().toString().padStart(2, '0')
  const realSlotMM = realSlot.getUTCMinutes().toString().padStart(2, '0')
  const realSlotTimeStr = `${realSlotHH}:${realSlotMM}:00`

  const { data: recurringStatus2 } = await supabase.rpc('get_teacher_recurring_status', { p_teacher_id: apt.teacher_id })
  const recConflictReal = recurringStatus2?.find((r: any) => 
     r.day_of_week === realSlotDay && 
     r.start_time === realSlotTimeStr && 
     r.is_occupied_by_other
  )

  if (recConflictReal) return { error: 'Este horário está reservado como aula fixa de outro aluno.' }

  const { error } = await supabase
    .from('appointments')
    .update({
      start_time: newStartTimeISO,
      end_time: newEndTimeISO,
      status: 'scheduled',
      updated_at: new Date().toISOString()
    })
    .eq('id', appointmentId)

  if (error) {
    if (error.code === '23P01') {
      return { error: 'Desculpe, o novo horário escolhido acabou de ser ocupado.' }
    }
    return { error: error.message }
  }

  // Notificar professor sobre remarcação de appointment real pelo aluno
  try {
    const { data: studentProf } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    const studentName = studentProf?.full_name || 'O aluno'
    const newDate = new Date(newStartTimeISO)
    const DIAS_PT = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado']
    const dayName = DIAS_PT[newDate.getUTCDay()]
    const timeStr = `${newDate.getUTCHours().toString().padStart(2,'0')}:${newDate.getUTCMinutes().toString().padStart(2,'0')}`
    await createNotification({
      userId: apt.teacher_id,
      type: 'class_rescheduled',
      title: 'Aluno remarcou uma aula',
      body: `${studentName} remarcou a aula para ${dayName} às ${timeStr}.`,
      metadata: { appointmentId, newStartTime: newStartTimeISO, studentId: user.id },
    })
  } catch {/* fire-and-forget */}

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
    .rpc('get_teacher_recurring_status', { p_teacher_id: teacherId })

  if (!availability || !recurring) return { error: 'Erro ao buscar disponibilidade' }

  // Busca appointments futuros agendados (não os do próprio aluno) para marcar
  // slots como ocupados na tela de seleção de horário fixo.
  // Sem isso, o aluno vê um slot livre, clica, e recebe um erro de conflito — UX confusa.
  const { data: futureApts } = await supabase
    .from('appointments')
    .select('start_time, status')
    .eq('teacher_id', teacherId)
    .gte('start_time', new Date().toISOString())
    .eq('status', 'scheduled')
    .neq('student_id', user.id)

  const { getTeacherWeeklyTemplate } = await import('./ScheduleEngine')
  const template = getTeacherWeeklyTemplate(availability, recurring, user.id, futureApts || [])

  return { data: template }
}


/**
 * Adiciona uma aula fixa recorrente usando o ISO UTC puro.
 */
export async function addRecurringClass(utcStartISO: string, teacherId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  // 0. Validar assinatura ativa
  const { data: subscription } = await supabase.from('subscriptions').select('status').eq('student_id', user.id).single()
  if (subscription?.status !== 'active') return { error: 'Sua conta está inativa. Renove para agendar aulas.' }

  // 0b. Validação de idioma (segurança backend)
  const { data: studentProfLang } = await supabase.from('profiles').select('student_language').eq('id', user.id).single()
  const { data: teacherProfLang } = await supabase.from('profiles').select('language').eq('id', teacherId).single()
  if (studentProfLang?.student_language && teacherProfLang?.language && studentProfLang.student_language !== teacherProfLang.language) {
    return { error: 'Você só pode agendar aulas com professores do seu idioma.' }
  }

  // 1. Validar limite do plano
  const { count } = await supabase
    .from('recurring_classes')
    .select('*', { count: 'exact' })
    .eq('student_id', user.id)

  if (count && count >= 1) {
    return { error: 'Limite de plano atingido: Máximo 1 horário fixo ativo.' }
  }

  // 1.5 Extrair dados em UTC
  const startDate = new Date(utcStartISO)
  const dayOfWeek = startDate.getUTCDay()
  
  const shNum = startDate.getUTCHours()
  const smNum = startDate.getUTCMinutes()
  const sh = shNum.toString().padStart(2, '0')
  const sm = smNum.toString().padStart(2, '0')
  const startTime = `${sh}:${sm}`
  const startTimeSec = `${startTime}:00`


  // 2. Validar conflito — aulas fixas recorrentes no mesmo horário (Proteção via RPC anonimizada)
  const { data: recurringStatus } = await supabase.rpc('get_teacher_recurring_status', { p_teacher_id: teacherId })
  const recConflict = recurringStatus?.find((r: any) => 
     r.day_of_week === dayOfWeek && 
     r.start_time === startTimeSec && 
     r.is_occupied_by_other
  )

  if (recConflict) {
    return { error: 'Este horário já foi preenchido por outro aluno.' }
  }

  // 2b. Validar conflito — appointments pontuais agendados no mesmo dia da semana e hora
  // Busca todos os appointments futuros do professor e filtra day+time em JS
  const { data: futureApts } = await supabase
    .from('appointments')
    .select('id, start_time')
    .eq('teacher_id', teacherId)
    .gte('start_time', new Date().toISOString())
    .eq('status', 'scheduled')
    .neq('student_id', user.id)

  let conflictingApts: any[] = []
  if (futureApts) {
    conflictingApts = futureApts.filter(a => {
      const d = new Date(a.start_time)
      const dHH = d.getUTCHours().toString().padStart(2, '0')
      const dMM = d.getUTCMinutes().toString().padStart(2, '0')
      return d.getUTCDay() === dayOfWeek && `${dHH}:${dMM}:00` === startTimeSec
    })
  }

  // 3. Validar se professor trabalha nesse horário
  const { data: avails } = await supabase
    .from('teacher_availability')
    .select('*')
    .eq('teacher_id', teacherId)
    .eq('day_of_week', dayOfWeek)

  let isWithinAvailability = false
  if (avails) {
    // Calcular o slot em minutos desde meia-noite UTC para comparação numérica
    const slotMinutes = shNum * 60 + smNum
    for (const av of avails) {
      const [avShRaw, avSmRaw] = av.start_time.split(':').map(Number)
      const [avEhRaw, avEmRaw] = av.end_time.split(':').map(Number)
      const avStartMin = avShRaw * 60 + avSmRaw
      let avEndMin = avEhRaw * 60 + avEmRaw
      // Cross-midnight: se end <= start, o expediente cruza a meia-noite UTC
      if (avEndMin <= avStartMin) avEndMin += 24 * 60
      // Verificar se o slot cabe dentro do expediente (em minutos normalizados)
      const normalizedSlot = slotMinutes < avStartMin ? slotMinutes + 24 * 60 : slotMinutes
      if (normalizedSlot >= avStartMin && normalizedSlot < avEndMin) {
        isWithinAvailability = true
        break
      }
    }
  }


  if (!isWithinAvailability) {
    return { error: 'O professor não está disponível neste horário.' }
  }

  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000)
  const eh = endDate.getUTCHours().toString().padStart(2, '0')
  const em = endDate.getUTCMinutes().toString().padStart(2, '0')
  const endTime = `${eh}:${em}:00`

  const { error } = await supabase.from('recurring_classes').insert({
    student_id: user.id,
    teacher_id: teacherId,
    day_of_week: dayOfWeek,
    start_time: startTimeSec,
    end_time: endTime
  })

  if (error) {
    if (error.code === '23505') {
      return { error: 'Você ou outro aluno já possui uma aula fixa neste exato horário.' }
    }
    return { error: error.message }
  }

  // 5. Auto-compensação de conflitos pontuais (Appointments e Ausências)
  // Buscamos conflitos com agendamentos de outros alunos E ausências já cadastradas do professor
  const { data: futureAbsences } = await supabase
    .from('teacher_absences')
    .select('absence_date, reason')
    .eq('teacher_id', teacherId)
    .gte('absence_date', new Date().toISOString().split('T')[0])

  let absenceMatches = 0
  if (futureAbsences) {
    for (const abs of futureAbsences) {
        // Usamos T12:00:00Z para garantir que ao converter para Date o dia não mude por deslocamento de fuso no server
        const absDate = new Date(`${abs.absence_date}T12:00:00Z`)
        if (absDate.getUTCDay() === dayOfWeek) {
            absenceMatches++
        }
    }
  }

  const totalCreditsToGrant = (conflictingApts?.length || 0) + absenceMatches

  if (totalCreditsToGrant > 0) {
    // Conceder créditos via RPC atômica (evita UPDATE direto bloqueado pela trigger protect_profile_fields)
    const { error: creditGrantErr } = await supabase.rpc('add_n_replacement_credits', {
      student_uuid: user.id,
      amount: totalCreditsToGrant
    })
    if (creditGrantErr) {
      console.error('[addRecurringClass] Erro ao conceder créditos:', creditGrantErr.message)
      // Não bloqueia o fluxo — a aula fixa já foi criada com sucesso
    }

    // Apenas para conflicting appointments, inserimos os cancelamentos no banco (para liberar o slot)
    // Ausências do professor não precisam de insert de cancelamento pois o ScheduleEngine já as bloqueia via status 'teacher_absent'
    if (conflictingApts && conflictingApts.length > 0) {
      for (const apt of conflictingApts) {
        const aptStart = new Date(apt.start_time)
        const aptEnd = new Date(apt.start_time)
        aptEnd.setUTCHours(endDate.getUTCHours(), endDate.getUTCMinutes(), 0, 0)
        
        await supabase.from('appointments').insert({
          student_id: user.id,
          teacher_id: teacherId,
          start_time: aptStart.toISOString(),
          end_time: aptEnd.toISOString(),
          status: 'cancelled',
          cancellation_reason: 'Conflito prévio com aula de rep./avulsa',
          cancelled_by: user.id
        })
      }
    }
  }
  
  revalidatePath('/dashboard/profile')
  return { 
    success: true, 
    grantedCredits: totalCreditsToGrant,
    absenceCount: absenceMatches,
    appointmentConflictCount: conflictingApts?.length || 0
  }
}

/**
 * Remove uma aula fixa recorrente.
 */
export async function removeRecurringClass(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  // Trava de troca segura: Impede a troca se houver aulas extras/remarcadas agendadas no futuro
  const { data: futureApts } = await supabase
    .from('appointments')
    .select('id')
    .eq('student_id', user.id)
    .gte('start_time', new Date().toISOString())
    .eq('status', 'scheduled')

  if (futureApts && futureApts.length > 0) {
    return { error: 'Você possui aulas futuras remarcadas ou de reposição. Conclua ou remova essas aulas antes de alterar seu horário fixo.' }
  }

  // 1. Buscar os dados da aula e do aluno ANTES de deletar para poder notificar
  const { data: recData } = await supabase
    .from('recurring_classes')
    .select('teacher_id, day_of_week, start_time')
    .eq('id', id)
    .eq('student_id', user.id)
    .maybeSingle()

  const { data: studentProf } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
  const studentName = studentProf?.full_name || 'O aluno'

  // 2. Deletar a aula
  const { error } = await supabase.from('recurring_classes').delete().eq('id', id).eq('student_id', user.id)
  if (error) return { error: error.message }

  // 3. Notificar professor que o aluno removeu o horário fixo permanentemente
  if (recData) {
    try {
      const DIAS_PT = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado']
      const dayName = DIAS_PT[recData.day_of_week] || 'desconhecido'
      const timeStr = recData.start_time.substring(0, 5)
      
      // Notifica o professor
      await createNotification({
        userId: recData.teacher_id,
        type: 'class_cancelled',
        title: 'Horário fixo removido pelo aluno',
        body: `${studentName} removeu o horário fixo de ${dayName} às ${timeStr} permanentemente.`,
        metadata: { studentId: user.id },
      })

      // Notifica toda a gerência operacional
      const { data: masters } = await supabase.from('profiles').select('id').in('role', ['admin_master', 'suporte', 'dev'])
      if (masters) {
        for (const master of masters) {
          await createNotification({
            userId: master.id,
            type: 'system_alert',
            title: 'Alerta de Retenção',
            body: `${studentName} removeu seu horário fixo de ${dayName} às ${timeStr}. Entre em contato para entender o motivo.`,
            metadata: { studentId: user.id, type: 'recurring_removed' },
          })
        }
      }
    } catch {/* fire-and-forget */}
  }

  revalidatePath('/dashboard/profile')
  return { success: true }
}

/**
 * Cancela uma instância específica de uma aula fixa recorrente.
 * Cria um appointment cancelado como exceção (o ScheduleEngine libera o slot)
 * e concede 1 crédito de reposição ao aluno.
 */
export async function cancelRecurringClassInstance(syntheticId: string, reason: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAnyAdmin = profile?.role === 'admin' || profile?.role === 'admin_master'

  // syntheticId: rec-{recurringId}-{isoDate}
  const parts = syntheticId.split('-')
  const recurringId = parts.slice(1, 6).join('-')
  const slotDateISO = parts.slice(6).join('-')

  const { data: rec } = await supabase
    .from('recurring_classes')
    .select('student_id, teacher_id, start_time, end_time')
    .eq('id', recurringId)
    .maybeSingle()

  if (!rec) return { error: 'Aula recorrente não encontrada.' }

  // Autorização: o próprio aluno da aula OU um admin podem cancelar
  const isOwnerStudent = rec.student_id === user.id
  if (!isAnyAdmin && !isOwnerStudent) {
    return { error: 'Você não tem permissão para cancelar esta aula.' }
  }

  const [sh, sm] = rec.start_time.split(':').map(Number)
  const [eh, em] = rec.end_time.split(':').map(Number)
  const slotStart = new Date(slotDateISO)
  slotStart.setUTCHours(sh, sm, 0, 0)
  const slotEnd = new Date(slotDateISO)
  slotEnd.setUTCHours(eh, em, 0, 0)

  // Chamada à RPC atômica que garante idempotência (via Unique Index) e gerencia os créditos de forma segura
  const { data: rpcData, error: rpcError } = await supabase.rpc('cancel_and_credit_recurring', {
    p_student_id: rec.student_id,
    p_teacher_id: rec.teacher_id,
    p_start_time: slotStart.toISOString(),
    p_end_time: slotEnd.toISOString(),
    p_reason: reason,
    p_cancelled_by: user.id
  })

  if (rpcError) return { error: rpcError.message }

  // Se a RPC identificou flag already_exists_or_ignored, interrompemos aqui (Idempotência disparada pelo ON CONFLICT)
  if (rpcData && rpcData.success === false) {
    return { error: 'Ocorrência já foi manipulada/cancelada anteriormente.' }
  }

  const shouldGrantCredit = rpcData?.credits_granted === true

  // Notificar aluno se for o admin que cancelou
  if (isAnyAdmin && !isOwnerStudent) {
    await createNotification({
      userId: rec.student_id,
      type: 'class_cancelled',
      title: shouldGrantCredit ? 'Aula cancelada pelo professor' : 'Ausência registrada',
      body: shouldGrantCredit
        ? `Uma aula foi cancelada. 1 crédito de reposição foi adicionado à sua conta.${reason ? ` Motivo: ${reason}` : ''}`
        : `Sua ausência foi registrada em uma aula. Nenhum crédito foi concedido.`,
      metadata: { syntheticId, reason },
    })
  }

  // Notificar professor quando o próprio aluno cancela
  if (isOwnerStudent && !isAnyAdmin) {
    const DIAS_PT = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado']
    const { data: studentProf } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    const studentName = studentProf?.full_name || 'O aluno'
    // slotDateISO é a data da instância (ex: '2025-05-06')
    const slotDate = new Date(slotDateISO)
    const dayName = DIAS_PT[slotDate.getUTCDay()] || 'desconhecido'
    const timeStr = rec.start_time.substring(0, 5)
    await createNotification({
      userId: rec.teacher_id,
      type: 'class_cancelled',
      title: 'Aluno cancelou uma aula',
      body: `${studentName} cancelou a aula de ${dayName} às ${timeStr}.${reason ? ` Motivo: ${reason}` : ''}`,
      metadata: { syntheticId, studentId: user.id, reason },
    })
  }

  revalidatePath('/admin/agenda')
  revalidatePath('/dashboard/profile')
  revalidatePath('/dashboard/minhas-aulas')
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

  // Marcar como cancelada e registrar motivo (SÓ SE ESTIVER EM scheduled)
  const { data: updatedApt, error } = await supabase
    .from('appointments')
    .update({ 
      status: 'cancelled', 
      cancellation_reason: reason, 
      cancelled_by: user.id 
    })
    .eq('id', id)
    .eq('status', 'scheduled')
    .select('*')
    .maybeSingle()

  if (error) {
    if (error.code === '23505') { // Unique violation: idx_unique_cancellation_slot
      return { error: 'Esta ocorrência já foi cancelada anteriormente.' }
    }
    return { error: error.message }
  }

  if (!updatedApt) {
    // Se não retornou nada, é porque não estava mais 'scheduled' (já cancelada ou inexistente)
    return { error: 'Esta ocorrência já foi processada ou não está mais ativa.' }
  }

  // Conceder crédito de reposição — exceto quando motivo for ausência do próprio aluno
  const shouldGrantCredit = reason !== 'Aluno não compareceu'
  
  if (updatedApt.student_id) {
    console.log('--- AUDITORIA DE CANCELAMENTO ---', {
      method: 'cancelAppointmentByTeacher',
      student_id: updatedApt.student_id,
      reason,
      shouldGrantCredit,
    })

    if (shouldGrantCredit) {
      console.log('>>> Chamando RPC: add_replacement_credit com', { student_uuid: updatedApt.student_id })
      const { data: rpcData, error: rpcErr } = await supabase.rpc('add_replacement_credit', { student_uuid: updatedApt.student_id })
      
      console.log('<<< Retorno da RPC add_replacement_credit:', { rpcData, rpcErr })

      if (rpcErr) {
        console.error('Erro ao conceder crédito:', rpcErr)
        return { error: 'Aula cancelada, mas houve uma falha ao adicionar o crédito de reposição no banco.' }
      }
    }

    // Notificar aluno
    await createNotification({
      userId: updatedApt.student_id,
      type: 'class_cancelled',
      title: shouldGrantCredit ? 'Aula cancelada pelo professor' : 'Ausência registrada',
      body: shouldGrantCredit
        ? `Sua aula foi cancelada e 1 crédito de reposição foi adicionado.${reason ? ` Motivo: ${reason}` : ''}`
        : `Sua ausência foi registrada. Nenhum crédito foi concedido nesta aula.`,
      metadata: { appointmentId: id, reason },
    })
  }

  revalidatePath('/admin/agenda')
  revalidatePath('/dashboard/profile')
  revalidatePath('/dashboard/minhas-aulas')
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

  const [yyyy, mm, dd] = dateISO.split('T')[0].split('-').map(Number);
  // Ponto de segurança UTC 12:00 evita shift de véspera por Timezone local
  const targetDateUTC = new Date(Date.UTC(yyyy, mm - 1, dd, 12, 0, 0))
  const dayOfWeek = targetDateUTC.getUTCDay()

  const startOfDay = new Date(Date.UTC(yyyy, mm - 1, dd, 0, 0, 0))
  const endOfDay = new Date(Date.UTC(yyyy, mm - 1, dd, 23, 59, 59, 999))
  const targetIsoStr = `${yyyy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`

  // A. Cancelar agendamentos pontuais
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('teacher_id', user.id)
    .gte('start_time', startOfDay.toISOString())
    .lte('start_time', endOfDay.toISOString())
    .eq('status', 'scheduled')

  const processedSlots = new Set<string>() // formato "student_id:startTimeISO"
  const shouldGrantCredit = reason !== 'Aluno não compareceu'

  if (appointments) {
    for (const apt of appointments) {
      await cancelAppointmentByTeacher(apt.id, reason)
      processedSlots.add(`${apt.student_id}:${apt.start_time}`)
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
      const [sh, sm] = rec.start_time.split(':').map(Number)
      const istart = new Date(Date.UTC(yyyy, mm - 1, dd, sh, sm, 0, 0))
      const [eh, em] = rec.end_time.split(':').map(Number)
      const iend = new Date(Date.UTC(yyyy, mm - 1, dd, eh, em, 0, 0))

      const slotKey = `${rec.student_id}:${istart.toISOString()}`
      
      if (!processedSlots.has(slotKey)) {
        // Tenta inserir apenas se não houver conflito (idempotência via unique key student+teacher+time)
        const { data: newApt, error: insertError } = await supabase
          .from('appointments')
          .insert({
            student_id: rec.student_id,
            teacher_id: user.id,
            start_time: istart.toISOString(),
            end_time: iend.toISOString(),
            status: 'cancelled',
            cancellation_reason: reason,
            cancelled_by: user.id
          })
          .select('*')
          .maybeSingle()

        // Se o insert falhou (provavelmente यूनिक constraint) ou não retornou dados, ignoramos o crédito
        if (insertError || !newApt) {
          processedSlots.add(slotKey)
          continue
        }

        console.log('--- AUDITORIA DE CANCELAMENTO DIA ---', {
          method: 'cancelDayByTeacher',
          student_id: rec.student_id,
          reason,
          shouldGrantCredit
        })

        if (shouldGrantCredit) {
          console.log('>>> Chamando RPC: add_replacement_credit com', { student_uuid: rec.student_id })
          const { data: rpcData, error: rpcErr } = await supabase.rpc('add_replacement_credit', { student_uuid: rec.student_id })
          
          console.log('<<< Retorno da RPC add_replacement_credit no dia:', { rpcData, rpcErr })

          if (rpcErr) {
            console.error('Erro ao conceder crédito no cancelamento do dia:', rpcErr)
          }
        }
        processedSlots.add(slotKey)

        // Notificar aluno sobre cancelamento da aula fixa daquele dia
        await createNotification({
          userId: rec.student_id,
          type: 'class_cancelled',
          title: shouldGrantCredit ? 'Aula cancelada pelo professor' : 'Ausência registrada',
          body: shouldGrantCredit
            ? `Sua aula foi cancelada e 1 crédito de reposição foi adicionado.${reason ? ` Motivo: ${reason}` : ''}`
            : `Sua ausência foi registrada. Nenhum crédito foi concedido nesta aula.`,
          metadata: { date: targetIsoStr, reason },
        })
      }
    }
  }

  // C. Inserir bloqueio oficial na teacher_absences para fechar a agenda
  const { error: absError } = await supabase.from('teacher_absences').upsert({
    teacher_id: user.id,
    absence_date: targetIsoStr,
    reason: reason
  }, { onConflict: 'teacher_id, absence_date' })

  if (absError) return { error: 'Erro ao registrar bloqueio no sistema: ' + absError.message }

  revalidatePath('/admin/agenda')
  revalidatePath('/dashboard/profile')
  revalidatePath('/dashboard/schedule')
  return { success: true }
}

/**
 * Retorna as datas futuras em que o professor possui aulas marcadas
 * (para uso no menu de Desmarcar Dia Inteiro).
 */
export async function getTeacherActiveDays() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const todayISO = new Date().toISOString().split('T')[0]
  const in30DaysString = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
  const maxEnd = new Date(in30DaysString)

  // 1. Apontamentos single
  const { data: apts } = await supabase
    .from('appointments')
    .select('start_time')
    .eq('teacher_id', user.id)
    .gte('start_time', todayISO)
    .lte('start_time', in30DaysString)
    .eq('status', 'scheduled')

  // 2. Recorrências da semana
  const { data: recs } = await supabase
    .from('recurring_classes')
    .select('day_of_week')
    .eq('teacher_id', user.id)

  const activeSet = new Set<string>()

  if (apts) {
    for (const a of apts) {
      activeSet.add(new Date(a.start_time).toISOString().split('T')[0])
    }
  }

  if (recs) {
    const days = [...new Set(recs.map(r => r.day_of_week))]
    let curr = new Date()
    while (curr <= maxEnd) {
      if (days.includes(curr.getUTCDay())) {
        activeSet.add(curr.toISOString().split('T')[0])
      }
      // increment 1 day
      curr = new Date(curr.getTime() + 24 * 3600 * 1000)
    }
  }

  // Ordenar e formatar retorno
  const dates = Array.from(activeSet).sort()
  return { data: dates }
}

/**
 * Retorna a grid de horários disponíveis de um professor.
 * Útil para componentes clientes como o modal de Seleção de Horário para Eventos.
 */
export async function getTeacherScheduleGrid(teacherId: string, userTimezone: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { data: availability } = await supabase.from('teacher_availability').select('*').eq('teacher_id', teacherId)
  const { data: recurring } = await supabase.rpc('get_teacher_recurring_status', { p_teacher_id: teacherId })
  const { data: absences } = await supabase.rpc('get_teacher_absences_public', { p_teacher_id: teacherId })
  
  const today = new Date()
  today.setHours(0,0,0,0)

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('teacher_id', teacherId)
    .gte('start_time', today.toISOString())
    .in('status', ['scheduled', 'cancelled'])

  const { generateScheduleGrid } = await import('./ScheduleEngine')
  
  const groupedDates = generateScheduleGrid(
    availability || [],
    recurring || [],
    appointments || [],
    user.id,
    userTimezone,
    undefined,
    absences || []
  )

  return { groupedDates }
}

