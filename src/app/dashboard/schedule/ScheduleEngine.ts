import { addDays, addMinutes, isBefore } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'

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
  myUserId: string,
  userTimezone: string
) {
  const nowUTC = new Date()
  const todayUTC = new Date(Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth(), nowUTC.getUTCDate()))
  // Gerar até 45 dias no futuro
  const endIntervalUTC = new Date(todayUTC.getTime() + 45 * 24 * 3600 * 1000)
  
  const daysUTC = []
  let curr = todayUTC
  while (curr.getTime() <= endIntervalUTC.getTime()) {
    daysUTC.push(new Date(curr.getTime()))
    curr = new Date(curr.getTime() + 24 * 3600 * 1000)
  }

  const groupedDates: Record<string, Slot[]> = {}

  for (const dateUTC of daysUTC) {
    const dayOfWeek = dateUTC.getUTCDay()

    const avails = availability.filter(a => a.day_of_week === dayOfWeek)
    
    for (const av of avails) {
      if (!av.start_time || !av.end_time) continue
      
      const [sh, sm] = av.start_time.split(':').map(Number)
      const [eh, em] = av.end_time.split(':').map(Number)
      
      let slotStartTime = new Date(Date.UTC(dateUTC.getUTCFullYear(), dateUTC.getUTCMonth(), dateUTC.getUTCDate(), sh, sm, 0, 0))
      const dayEndTime = new Date(Date.UTC(dateUTC.getUTCFullYear(), dateUTC.getUTCMonth(), dateUTC.getUTCDate(), eh, em, 0, 0))

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
        const slotHour = slotStartTime.getUTCHours().toString().padStart(2, '0')
        const slotMin = slotStartTime.getUTCMinutes().toString().padStart(2, '0')
        const slotSec = slotStartTime.getUTCSeconds().toString().padStart(2, '0')
        const slotTimeStr = `${slotHour}:${slotMin}:${slotSec}`
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

        // Agora transformamos o horário absoluto em timezone-string para o calendário Group do usuário
        const dStrContext = formatInTimeZone(slotStartTime, userTimezone, 'yyyy-MM-dd')
        if (!groupedDates[dStrContext]) {
          groupedDates[dStrContext] = []
        }

        groupedDates[dStrContext].push({
          startTimeISO: slotStartTime.toISOString(),
          endTimeISO: slotEndTime.toISOString(),
          prepStartTimeISO: slotStartTime.toISOString(),
          classStartTimeISO: classStartTime.toISOString(),
          status
        })

        slotStartTime = slotEndTime
      }
    }
  }

  // Ordena globalmente os slots de cada dia localizado mapeado
  for (const dStr of Object.keys(groupedDates)) {
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
  
  // Utilizar a semana ATUAL no fuso UTC para não sofrer deslocamento de Historic DST (Horário de Verão ano 2000)
  const now = new Date()
  const currentUTCWeekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  // Ajustar para domingo absoluto em UTC
  while (currentUTCWeekStart.getUTCDay() !== 0) {
    currentUTCWeekStart.setUTCDate(currentUTCWeekStart.getUTCDate() - 1)
  }

  // Para cada dia da semana (0-6)
  for (let day = 0; day <= 6; day++) {
    weekTemplate[day] = []
    const dayAvails = availability.filter(a => a.day_of_week === day)
    
    for (const av of dayAvails) {
      const [sh, sm] = av.start_time.split(':').map(Number)
      const [eh, em] = av.end_time.split(':').map(Number)
      
      let start = new Date(Date.UTC(currentUTCWeekStart.getUTCFullYear(), currentUTCWeekStart.getUTCMonth(), currentUTCWeekStart.getUTCDate() + day, sh, sm, 0))
      const end = new Date(Date.UTC(currentUTCWeekStart.getUTCFullYear(), currentUTCWeekStart.getUTCMonth(), currentUTCWeekStart.getUTCDate() + day, eh, em, 0))
      
      while (isBefore(start, end)) {
        const slotEnd = addMinutes(start, 60)
        const shString = start.getUTCHours().toString().padStart(2, '0')
        const smString = start.getUTCMinutes().toString().padStart(2, '0')
        const ssString = start.getUTCSeconds().toString().padStart(2, '0')
        const timeStr = `${shString}:${smString}:${ssString}`
        
        // Verifica se já existe recorrência NESSE DIA/HORA
        const isOccupied = recurring.some(r => 
          r.day_of_week === day && 
          r.start_time === timeStr &&
          r.student_id !== myUserId // Se for minha, eu posso "ver" como livre para trocar? Não, melhor mostrar como ocupada.
        )
        
        if (!isOccupied) {
          const classStart = addMinutes(start, 10);
          weekTemplate[day].push({
            dayOfWeek: day, // explicitly include UTC day
            start: timeStr.substring(0, 5), // raw UTC string
            utcStartISO: start.toISOString(),
            utcClassStartISO: classStart.toISOString(),
            utcEndISO: slotEnd.toISOString()
          })
        }
        
        start = slotEnd
      }
    }
  }
  
  return weekTemplate
}
