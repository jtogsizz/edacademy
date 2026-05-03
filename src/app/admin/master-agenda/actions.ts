'use server'

import { createClient } from '@/utils/supabase/server'
import { formatInTimeZone } from 'date-fns-tz'

export interface GridSlot {
  id: string
  start_time: string
  end_time: string
  status: 'scheduled' | 'cancelled'
  studentName?: string
  is_recurring: boolean
  cancellation_reason?: string
}

export async function fetchMasterGridData(
  teacherId: string,
  startIso: string,
  endIso: string,
  timezone: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin_master' && profile?.role !== 'dev') {
    return { error: 'Acesso negado. Apenas admin_master ou dev.' }
  }

  // Buscar apenas aulas recorrentes e appointments pontuais
  // (não precisamos mais de teacher_availability — a Planilha mostra apenas aulas, não slots livres)
  const [recRes, aptRes] = await Promise.all([
    supabase
      .from('recurring_classes')
      .select('*, profiles!recurring_classes_student_id_fkey(full_name)')
      .eq('teacher_id', teacherId),
    supabase
      .from('appointments')
      .select('*, profiles!appointments_student_id_fkey(full_name)')
      .eq('teacher_id', teacherId)
      .gte('start_time', startIso)
      .lte('start_time', endIso),
  ])

  if (recRes.error) return { error: recRes.error.message }
  if (aptRes.error) return { error: aptRes.error.message }

  const grouped: Record<string, GridSlot[]> = {}
  const consumedIds = new Set<string>()

  const startDateUTC = new Date(startIso)
  const endDateUTC = new Date(endIso)

  // Expandir aulas recorrentes para os dias da semana solicitada
  let curr = new Date(startDateUTC.getTime())
  while (curr.getTime() <= endDateUTC.getTime()) {
    const dayOfWeek = curr.getUTCDay()
    const dayRecs = (recRes.data || []).filter((r: any) => r.day_of_week === dayOfWeek)

    for (const rec of dayRecs) {
      const [h, m, s] = rec.start_time.split(':').map(Number)
      const [eh, em, es] = (rec.end_time || rec.start_time).split(':').map(Number)

      const slotStart = new Date(
        Date.UTC(curr.getUTCFullYear(), curr.getUTCMonth(), curr.getUTCDate(), h, m, s || 0)
      )
      const slotEnd = new Date(
        Date.UTC(curr.getUTCFullYear(), curr.getUTCMonth(), curr.getUTCDate(), eh, em, es || 0)
      )
      // Cross-midnight UTC fix
      if (slotEnd.getTime() <= slotStart.getTime()) {
        slotEnd.setUTCDate(slotEnd.getUTCDate() + 1)
      }

      // Verificar se existe um appointment que sobrescreve esse slot (remarcação/cancelamento)
      const override = (aptRes.data || []).find(
        (a: any) => new Date(a.start_time).getTime() === slotStart.getTime()
      )

      const dateStr = formatInTimeZone(slotStart, timezone, 'yyyy-MM-dd')
      if (!grouped[dateStr]) grouped[dateStr] = []

      if (override) {
        grouped[dateStr].push({
          id: override.id,
          start_time: override.start_time,
          end_time: override.end_time,
          status: override.status,
          studentName: override.profiles?.full_name,
          is_recurring: true,
          cancellation_reason: override.cancellation_reason,
        })
        consumedIds.add(override.id)
      } else {
        grouped[dateStr].push({
          id: `rec-${rec.id}-${slotStart.toISOString()}`,
          start_time: slotStart.toISOString(),
          end_time: slotEnd.toISOString(),
          status: 'scheduled',
          studentName: rec.profiles?.full_name,
          is_recurring: true,
        })
      }
    }

    curr = new Date(curr.getTime() + 24 * 60 * 60 * 1000)
  }

  // Adicionar appointments pontuais não consumidos (reposições/extras)
  for (const apt of aptRes.data || []) {
    if (!consumedIds.has(apt.id)) {
      const start = new Date(apt.start_time)
      const dateStr = formatInTimeZone(start, timezone, 'yyyy-MM-dd')
      if (!grouped[dateStr]) grouped[dateStr] = []
      grouped[dateStr].push({
        id: apt.id,
        start_time: apt.start_time,
        end_time: apt.end_time,
        status: apt.status,
        studentName: apt.profiles?.full_name,
        is_recurring: false,
        cancellation_reason: apt.cancellation_reason,
      })
    }
  }

  // Ordenar cada dia cronologicamente
  for (const dateStr of Object.keys(grouped)) {
    grouped[dateStr].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    )
  }

  return { data: grouped }
}
