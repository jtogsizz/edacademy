import { addDays, addMinutes, format, getDay, isBefore, startOfMonth, startOfDay } from 'date-fns'

export interface Slot {
  startTimeISO: string
  endTimeISO: string
  prepStartTimeISO: string
  classStartTimeISO: string
  status: 'free' | 'occupied' | 'my_class'
}

export function generateScheduleGrid(
  availability: any[],
  recurring: any[],
  appointments: any[],
  myUserId: string
) {
  const today = startOfDay(new Date())
  // Gerar até 45 dias no futuro
  const endInterval = addDays(today, 45)
  const days = []
  
  let curr = today
  while (isBefore(curr, endInterval) || curr.getTime() === endInterval.getTime()) {
    days.push(curr)
    curr = addDays(curr, 1)
  }

  const groupedDates: Record<string, Slot[]> = {}

  for (const date of days) {
    const dayOfWeek = getDay(date)
    const dStr = format(date, 'yyyy-MM-dd')
    groupedDates[dStr] = []

    const avails = availability.filter(a => a.day_of_week === dayOfWeek)
    
    for (const av of avails) {
      if (!av.start_time || !av.end_time) continue
      
      const [sh, sm] = av.start_time.split(':').map(Number)
      const [eh, em] = av.end_time.split(':').map(Number)
      
      let slotStartTime = new Date(date)
      slotStartTime.setHours(sh, sm, 0, 0)
      
      const dayEndTime = new Date(date)
      dayEndTime.setHours(eh, em, 0, 0)

      while (isBefore(slotStartTime, dayEndTime)) {
        const slotEndTime = addMinutes(slotStartTime, av.slot_duration || 60)
        
        // Verifica se é passado
        if (isBefore(slotStartTime, new Date())) {
          slotStartTime = slotEndTime
          continue
        }

        // Camada 2: Recurring Classes (Aulas Fixas Mensais)
        // Check if there is any recurring class that starts EXACTLY at this time for this day of week
        // We only check start_time purely
        const slotTimeStr = format(slotStartTime, 'HH:mm:ss')
        const recurringClass = recurring.find(r => r.day_of_week === dayOfWeek && r.start_time === slotTimeStr)

        let status: 'free' | 'occupied' | 'my_class' = 'free'

        if (recurringClass) {
          status = recurringClass.student_id === myUserId ? 'my_class' : 'occupied'
        }

        // Camada 3: Appointments/Remarcações Pontuais
        // Check if there is an appointment overriding this exact start_time
        const appt = appointments.find(a => new Date(a.start_time).getTime() === slotStartTime.getTime())
        
        if (appt) {
          if (appt.status === 'cancelled') {
             // Overrides the recurring class back to free!
             status = 'free'
          } else if (appt.status === 'scheduled') {
             status = appt.student_id === myUserId ? 'my_class' : 'occupied'
          }
        }

        const classStartTime = addMinutes(slotStartTime, 10)

        groupedDates[dStr].push({
          startTimeISO: slotStartTime.toISOString(),
          endTimeISO: slotEndTime.toISOString(),
          prepStartTimeISO: slotStartTime.toISOString(),
          classStartTimeISO: classStartTime.toISOString(),
          status
        })

        slotStartTime = slotEndTime
      }
    }

    // Sort by time
    groupedDates[dStr].sort((a,b) => new Date(a.startTimeISO).getTime() - new Date(b.startTimeISO).getTime())
  }

  return groupedDates
}

/**
 * Gera um template de semana (0-6) com os horários disponíveis de um professor,
 * filtrando o que já está ocupado por OUTRAS recorrências.
 */
export function getTeacherWeeklyTemplate(
  availability: any[],
  recurring: any[],
  myUserId: string
) {
  const weekTemplate: Record<number, any[]> = {}
  
  // Para cada dia da semana (0-6)
  for (let day = 0; day <= 6; day++) {
    weekTemplate[day] = []
    const dayAvails = availability.filter(a => a.day_of_week === day)
    
    for (const av of dayAvails) {
      const [sh, sm] = av.start_time.split(':').map(Number)
      const [eh, em] = av.end_time.split(':').map(Number)
      
      let start = new Date(2000, 0, 1, sh, sm, 0)
      const end = new Date(2000, 0, 1, eh, em, 0)
      
      while (isBefore(start, end)) {
        const slotEnd = addMinutes(start, 60)
        const timeStr = format(start, 'HH:mm:ss')
        
        // Verifica se já existe recorrência NESSE DIA/HORA
        const isOccupied = recurring.some(r => 
          r.day_of_week === day && 
          r.start_time === timeStr &&
          r.student_id !== myUserId // Se for minha, eu posso "ver" como livre para trocar? Não, melhor mostrar como ocupada.
        )
        
        if (!isOccupied) {
          weekTemplate[day].push({
            start: timeStr.substring(0, 5),
            label: `${timeStr.substring(0, 5)} - ${format(slotEnd, 'HH:mm')}`
          })
        }
        
        start = slotEnd
      }
    }
  }
  
  return weekTemplate
}
