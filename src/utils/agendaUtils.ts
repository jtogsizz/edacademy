import { addDays, addWeeks, format, getDay, isAfter, isBefore, parseISO, startOfDay } from 'date-fns'

export interface UnifiedAppointment {
  id: string
  start_time: string
  end_time: string
  status: 'scheduled' | 'cancelled' | 'recurring'
  teacher: {
    id: string
    full_name: string
    whatsapp_number?: string
  }
  is_recurring: boolean
}

/**
 * Expande a regra de recorrência (ex: toda segunda 10h) em datas reais 
 * pelos próximos X dias.
 */
export function getUnifiedStudentAgenda(
  studentId: string,
  recurringClasses: any[],
  oneOffAppointments: any[],
  daysAhead: number = 30
): UnifiedAppointment[] {
  const agenda: UnifiedAppointment[] = []
  const today = startOfDay(new Date())
  const endLimit = addDays(today, daysAhead)

  // 1. Adicionar agendamentos manuais (remarcações/extras)
  for (const apt of oneOffAppointments) {
    agenda.push({
      id: apt.id,
      start_time: apt.start_time,
      end_time: apt.end_time,
      status: apt.status,
      teacher: apt.teacher,
      is_recurring: false
    })
  }

  // 2. Expandir recorrências
  for (const rec of recurringClasses) {
    let current = today
    // Avançar até o dia da semana da recorrência
    while (getDay(current) !== rec.day_of_week) {
      current = addDays(current, 1)
    }

    // Gerar instâncias semanais
    while (isBefore(current, endLimit)) {
      // Criar timestamp ISO para comparar com appointments
      const [h, m, s] = rec.start_time.split(':').map(Number)
      const instanceStart = new Date(current)
      instanceStart.setHours(h, m, s || 0, 0)
      
      const [eh, em, es] = rec.end_time.split(':').map(Number)
      const instanceEnd = new Date(current)
      instanceEnd.setHours(eh, em, es || 0, 0)

      const instanceStartISO = instanceStart.toISOString()

      // Verificar se essa data específica já tem um appointment manual que sobrescreve
      // (Se houver um appointment no mesmo start_time, ele "vence" a recorrência)
      const override = oneOffAppointments.find(a => a.start_time === instanceStartISO)

      if (!override && isAfter(instanceStart, new Date())) {
        agenda.push({
          id: `rec-${rec.id}-${instanceStartISO}`,
          start_time: instanceStartISO,
          end_time: instanceEnd.toISOString(),
          status: 'scheduled', // Recorrência ativa
          teacher: rec.teacher,
          is_recurring: true
        })
      }

      current = addWeeks(current, 1)
    }
  }

  // Ordenar cronologicamente
  return agenda.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
}
