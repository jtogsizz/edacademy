'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { createNotification } from '@/lib/notifications'

async function getAuthTeacher(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role === 'admin' || profile?.role === 'admin_master') {
    return { id: user.id, timezone: profile.timezone }
  }
  return null
}

export async function addAvailability(dayOfWeek: number, startTime: string, endTime: string) {
  const supabase = await createClient()
  const teacherContext = await getAuthTeacher(supabase)
  if (!teacherContext) return { error: 'Não autorizado' }

  // Validação: apenas horários fechados (minutos = 00)
  const startMinutes = Number(startTime.split(':')[1] ?? -1)
  const endMinutes   = Number(endTime.split(':')[1]   ?? -1)
  if (startMinutes !== 0 || endMinutes !== 0) {
    return { error: 'Use apenas horários fechados, como 07:00 ou 14:00.' }
  }

  // Validação: fim deve ser maior que início
  if (endTime <= startTime) {
    return { error: 'O horário de fim deve ser maior que o horário de início.' }
  }

  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  const clientTz = cookieStore.get('client_tz')?.value
  const userTz = teacherContext.timezone || clientTz || 'America/Sao_Paulo'

  const { localToUtcTime } = await import('@/utils/agendaUtils')

  // Convert teacher local inputs to absolute UTC day and time
  const startUTC = localToUtcTime(dayOfWeek, startTime, userTz)
  const endUTC = localToUtcTime(dayOfWeek, endTime, userTz)

  // 1. Validação de Conflito: Verificar se já existe overlap no mesmo dia (Agora as equações rodam limpas em UTC)
  const { data: conflicts } = await supabase
    .from('teacher_availability')
    .select('id')
    .eq('teacher_id', teacherContext.id)
    .eq('day_of_week', startUTC.utcDay)
    .lt('start_time', endUTC.utcTime)
    .gt('end_time', startUTC.utcTime)

  if (conflicts && conflicts.length > 0) {
    return { error: 'Este horário conflita com outro já cadastrado para este dia' }
  }

  // 2. Inserção do novo bloco (em UTC)
  if (startTime && endTime) {
    const { error } = await supabase.from('teacher_availability').insert({
      teacher_id: teacherContext.id,
      day_of_week: startUTC.utcDay,
      start_time: startUTC.utcTime,
      end_time: endUTC.utcTime
    })
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/schedule')
  return { success: true }
}

/**
 * Remove um bloco de expediente do professor.
 *
 * Fluxo em 2 etapas:
 * 1. Sem `force`: verifica se há recurring_classes dentro do bloco.
 *    - Se sim: retorna { needsConfirmation: true, affectedStudents } sem deletar nada.
 *    - Se não: remove diretamente.
 * 2. Com `force: true`: cancela instâncias futuras (próximas 4 semanas) via
 *    cancel_and_credit_recurring, notifica alunos, deleta recurring_classes
 *    vinculadas, depois deleta o bloco de teacher_availability.
 *
 * Garante:
 * - Não afeta outros professores (teacher_id sempre filtrado)
 * - Não afeta outros dias (day_of_week filtrado)
 * - Não afeta horários fora do bloco (range start_time/end_time filtrado)
 * - Não duplica crédito (cancel_and_credit_recurring é idempotente via ON CONFLICT)
 */
export async function removeAvailability(id: string, force = false) {
  const supabase = await createClient()
  const teacherContext = await getAuthTeacher(supabase)
  if (!teacherContext) return { error: 'Não autorizado' }

  // 1. Buscar o bloco de expediente a ser removido
  const { data: block, error: blockErr } = await supabase
    .from('teacher_availability')
    .select('day_of_week, start_time, end_time')
    .eq('id', id)
    .eq('teacher_id', teacherContext.id)
    .maybeSingle()

  if (blockErr || !block) return { error: 'Bloco de expediente não encontrado.' }

  // 2. Buscar recurring_classes que se sobrepõem a este bloco:
  //    mesmo teacher + mesmo dia + start_time do fixo dentro do range do bloco
  //    (O aluno ocupa exatamente 1h dentro do bloco, ex: 10:00 dentro de 07:00–21:00)
  const { data: affected, error: affErr } = await supabase
    .from('recurring_classes')
    .select('id, student_id, start_time, end_time, profiles!recurring_classes_student_id_fkey(full_name)')
    .eq('teacher_id', teacherContext.id)
    .eq('day_of_week', block.day_of_week)
    .gte('start_time', block.start_time)
    .lt('start_time', block.end_time)

  if (affErr) return { error: 'Erro ao verificar alunos vinculados: ' + affErr.message }

  // 3. Sem alunos afetados — remoção direta
  if (!affected || affected.length === 0) {
    const { error } = await supabase.from('teacher_availability').delete().eq('id', id)
    if (error) return { error: 'Erro ao remover expediente: ' + error.message }
    revalidatePath('/admin/schedule')
    revalidatePath('/admin/agenda')
    revalidatePath('/dashboard/minhas-aulas')
    return { success: true }
  }

  // 4. Há alunos afetados e o professor ainda não confirmou — retornar lista
  if (!force) {
    const affectedStudents = affected.map((r: any) => ({
      recurringId: r.id,
      studentId: r.student_id,
      studentName: (r.profiles as any)?.full_name ?? 'Aluno desconhecido',
      startTime: r.start_time,
    }))
    return { needsConfirmation: true, affectedStudents }
  }

  // 5. Professor confirmou — processar cancelamentos
  // Calcular próximas 4 ocorrências de cada recurring_class
  const now = new Date()
  const DIAS_PT = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado']

  for (const rec of affected) {
    const [sh, sm] = (rec.start_time as string).split(':').map(Number)
    const [eh, em] = (rec.end_time as string).split(':').map(Number)
    const studentName = (rec.profiles as any)?.full_name ?? 'O aluno'

    // Gerar próximas 4 ocorrências (cobrindo 1 ciclo mensal do plano)
    const instances: Array<{ start: Date; end: Date }> = []
    let cursor = new Date(now)
    // Avança até o próximo dia da semana correto
    while (instances.length < 4) {
      if (cursor.getUTCDay() === block.day_of_week) {
        const iStart = new Date(cursor)
        iStart.setUTCHours(sh, sm, 0, 0)
        const iEnd = new Date(cursor)
        iEnd.setUTCHours(eh, em, 0, 0)
        if (iStart > now) {
          instances.push({ start: iStart, end: iEnd })
        }
      }
      cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
    }

    // Cancelar cada instância futura via RPC atômica (idempotente)
    for (const inst of instances) {
      const { error: rpcErr } = await supabase.rpc('cancel_and_credit_recurring', {
        p_student_id: rec.student_id,
        p_teacher_id: teacherContext.id,
        p_start_time: inst.start.toISOString(),
        p_end_time: inst.end.toISOString(),
        p_reason: 'Professor removeu este horário do expediente',
        p_cancelled_by: teacherContext.id,
      })
      if (rpcErr) {
        console.error('[removeAvailability] Erro na RPC cancel_and_credit_recurring:', rpcErr.message)
        // Não interrompe o loop — idempotência garante que duplicatas são ignoradas
      }
    }

    // Deletar a recurring_class para liberar o aluno a escolher novo horário
    const { error: delRecErr } = await supabase
      .from('recurring_classes')
      .delete()
      .eq('id', rec.id)

    if (delRecErr) {
      console.error('[removeAvailability] Erro ao deletar recurring_class:', delRecErr.message)
      return { error: `Erro ao desvincular a aula fixa do aluno ${studentName}: ${delRecErr.message}` }
    }

    // Notificar o aluno
    const dayName = DIAS_PT[block.day_of_week]
    const timeStr = (rec.start_time as string).substring(0, 5)
    await createNotification({
      userId: rec.student_id,
      type: 'class_cancelled',
      title: 'Horário fixo cancelado pelo professor',
      body: `Seu horário fixo de ${dayName} às ${timeStr} foi cancelado. Os créditos das próximas aulas foram adicionados à sua conta. Escolha um novo horário no agendamento.`,
      metadata: { recurringId: rec.id, dayOfWeek: block.day_of_week, startTime: rec.start_time },
    })
  }

  // Notifica a gerência sobre o impacto na grade se houve alunos desalojados
  if (affected.length > 0) {
    try {
      const { data: masters } = await supabase.from('profiles').select('id').in('role', ['admin_master', 'suporte', 'dev'])
      if (masters) {
        for (const master of masters) {
          await createNotification({
            userId: master.id,
            type: 'system_alert',
            title: 'Alteração Crítica de Grade',
            body: `O professor ${teacherContext.id} removeu um bloco de expediente, desalojando ${affected.length} aluno(s) fixo(s). Eles receberam créditos e foram avisados.`,
            metadata: { type: 'availability_removed_force', affectedCount: affected.length },
          })
        }
      }
    } catch {/* fire-and-forget */}
  }

  // 6. Agora sim — deletar o bloco de teacher_availability
  const { error: delAvErr } = await supabase.from('teacher_availability').delete().eq('id', id)
  if (delAvErr) return { error: 'Alunos desvinculados, mas erro ao remover expediente: ' + delAvErr.message }

  revalidatePath('/admin/schedule')
  revalidatePath('/admin/agenda')
  revalidatePath('/dashboard/minhas-aulas')
  return { success: true }
}


export async function addRecurringClass(studentId: string, dayOfWeek: number, startTime: string) {
  const supabase = await createClient()
  const teacherContext = await getAuthTeacher(supabase)
  if (!teacherContext) return { error: 'Não autorizado' }

  // Calcula end_time (60 mins)
  const [h, m] = startTime.split(':').map(Number)
  const endHour = (h + 1).toString().padStart(2, '0')
  const endTime = `${endHour}:${m.toString().padStart(2, '0')}:00`
  const startTimeSec = `${startTime}:00`

  const { error } = await supabase.from('recurring_classes').insert({
    teacher_id: teacherContext.id,
    student_id: studentId,
    day_of_week: dayOfWeek,
    start_time: startTimeSec,
    end_time: endTime
  })

  if (error) return { error: error.message }
  
  revalidatePath('/admin/schedule')
  return { success: true }
}

export async function removeRecurringClass(id: string) {
  const supabase = await createClient()
  const teacherContext = await getAuthTeacher(supabase)
  if (!teacherContext) return { error: 'Não autorizado' }

  await supabase.from('recurring_classes').delete().eq('id', id)
  revalidatePath('/admin/schedule')
  return { success: true }
}
