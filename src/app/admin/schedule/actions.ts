'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

async function getAuthTeacher(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role === 'admin' || profile?.role === 'admin_master') {
    return user.id
  }
  return null
}

export async function addAvailability(dayOfWeek: number, startTime: string, endTime: string) {
  const supabase = await createClient()
  const teacherId = await getAuthTeacher(supabase)
  if (!teacherId) return { error: 'Não autorizado' }

  const newStart = startTime + ':00'
  const newEnd = endTime + ':00'

  // 1. Validação de Conflito: Verificar se já existe overlap no mesmo dia
  const { data: conflicts } = await supabase
    .from('teacher_availability')
    .select('id')
    .eq('teacher_id', teacherId)
    .eq('day_of_week', dayOfWeek)
    .lt('start_time', newEnd)
    .gt('end_time', newStart)

  if (conflicts && conflicts.length > 0) {
    return { error: 'Este horário conflita com outro já cadastrado para este dia' }
  }

  // 2. Inserção do novo bloco
  if (startTime && endTime) {
    const { error } = await supabase.from('teacher_availability').insert({
      teacher_id: teacherId,
      day_of_week: dayOfWeek,
      start_time: newStart,
      end_time: newEnd
    })
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/schedule')
  return { success: true }
}

export async function removeAvailability(id: string) {
  const supabase = await createClient()
  const teacherId = await getAuthTeacher(supabase)
  if (!teacherId) return { error: 'Não autorizado' }

  await supabase.from('teacher_availability').delete().eq('id', id)
  revalidatePath('/admin/schedule')
  return { success: true }
}

export async function addRecurringClass(studentId: string, dayOfWeek: number, startTime: string) {
  const supabase = await createClient()
  const teacherId = await getAuthTeacher(supabase)
  if (!teacherId) return { error: 'Não autorizado' }

  // Calcula end_time (60 mins)
  const [h, m] = startTime.split(':').map(Number)
  const endHour = (h + 1).toString().padStart(2, '0')
  const endTime = `${endHour}:${m.toString().padStart(2, '0')}:00`
  const startTimeSec = `${startTime}:00`

  const { error } = await supabase.from('recurring_classes').insert({
    teacher_id: teacherId,
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
  const teacherId = await getAuthTeacher(supabase)
  if (!teacherId) return { error: 'Não autorizado' }

  await supabase.from('recurring_classes').delete().eq('id', id)
  revalidatePath('/admin/schedule')
  return { success: true }
}
