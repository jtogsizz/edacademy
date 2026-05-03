import { addDays, addMinutes, isBefore } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'

/**
 * Normaliza strings de TIME vindas do PostgreSQL para o formato canônico "HH:MM:SS".
 * O banco pode retornar "13:00", "13:00:00" ou "13:00:00.000000" dependendo do contexto.
 * Usar === diretamente entre dois formatos diferentes causa bug silencioso.
 */
function normalizeTime(t: string): string {
  if (!t) return ''
  // Pega apenas os primeiros 8 chars (HH:MM:SS), ignorando microsegundos
  const base = t.substring(0, 8)
  // Se vier só "HH:MM" (5 chars), adiciona ":00"
  if (base.length === 5) return `${base}:00`
  return base
}

export interface Slot {
  startTimeISO: string
  endTimeISO: string
  prepStartTimeISO: string
  classStartTimeISO: string
  status: 'free' | 'occupied' | 'my_class' | 'after_expiry' | 'teacher_absent'
  absenceReason?: string
}

export function generateScheduleGrid(
  availability: any[],
  recurring: any[],
  appointments: any[],
  myUserId: string,
  userTimezone: string,
  expiryDate?: Date,
  absences: any[] = []
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
      // Cross-midnight UTC fix: se o end_time <= start_time no mesmo dia UTC (ex: 21h BRT = 00h UTC)
      // o Date.UTC gera meia-noite do dia CORRENTE, que é antes do slot. Projetamos para o dia seguinte.
      let dayEndTime = new Date(Date.UTC(dateUTC.getUTCFullYear(), dateUTC.getUTCMonth(), dateUTC.getUTCDate(), eh, em, 0, 0))
      if (dayEndTime.getTime() <= slotStartTime.getTime()) {
        dayEndTime = new Date(dayEndTime.getTime() + 24 * 60 * 60 * 1000)
      }

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
        const slotTimeStr = `${slotHour}:${slotMin}:00`
        const isOccupiedByOtherStatus = recurring.some(r => r.day_of_week === dayOfWeek && normalizeTime(r.start_time) === slotTimeStr && r.is_occupied_by_other);
        const isMyClassStatus = recurring.some(r => r.day_of_week === dayOfWeek && normalizeTime(r.start_time) === slotTimeStr && r.is_my_class);

        let status: 'free' | 'occupied' | 'my_class' | 'after_expiry' | 'teacher_absent' = 'free'
        let absenceReasonStr: string | undefined = undefined

        // Camada 0: Ausência oficial na data
        const dayIsoString = dateUTC.toISOString().split('T')[0]
        const absenceMatch = absences.find(a => a.absence_date === dayIsoString)

        if (absenceMatch) {
          status = 'teacher_absent'
          absenceReasonStr = absenceMatch.display_reason
        } else {
          if (isMyClassStatus) {
            status = 'my_class'
          } else if (isOccupiedByOtherStatus) {
            status = 'occupied'
          }

          // Camada 3: Appointments/Remarcações Pontuais
          const appt = appointments.find(a => new Date(a.start_time).getTime() === slotStartTime.getTime())
          
          if (appt) {
            if (appt.status === 'cancelled') {
               status = 'free'
            } else if (appt.status === 'scheduled') {
               status = appt.student_id === myUserId ? 'my_class' : 'occupied'
            }
          }

          // Camada 4: Após vencimento do plano
          if (expiryDate && slotStartTime > expiryDate) {
            status = 'after_expiry'
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
          status,
          absenceReason: absenceReasonStr
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
  myUserId: string,
  appointments: any[] = []
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
      // Cross-midnight UTC fix: mesmo raciocínio de generateScheduleGrid
      let end = new Date(Date.UTC(currentUTCWeekStart.getUTCFullYear(), currentUTCWeekStart.getUTCMonth(), currentUTCWeekStart.getUTCDate() + day, eh, em, 0))
      if (end.getTime() <= start.getTime()) {
        end = new Date(end.getTime() + 24 * 60 * 60 * 1000)
      }
      
      while (isBefore(start, end)) {
        const slotEnd = addMinutes(start, 60)
        const shString = start.getUTCHours().toString().padStart(2, '0')
        const smString = start.getUTCMinutes().toString().padStart(2, '0')
        const timeStr = `${shString}:${smString}:00`
        
        const isOccupiedByOtherRecurring = recurring.some(r =>
          r.day_of_week === day &&
          normalizeTime(r.start_time) === timeStr &&
          r.is_occupied_by_other
        )
        
        const isMyClass = recurring.some(r =>
          r.day_of_week === day &&
          normalizeTime(r.start_time) === timeStr &&
          r.is_my_class
        )

        const isOccupiedByAppointment = appointments.some(a =>
          a.status === 'scheduled' &&
          new Date(a.start_time).getTime() === start.getTime()
        )

        const classStart = addMinutes(start, 10);
        weekTemplate[day].push({
          dayOfWeek: day,
          start: timeStr.substring(0, 5),
          utcStartISO: start.toISOString(),
          utcClassStartISO: classStart.toISOString(),
          utcEndISO: slotEnd.toISOString(),
          isOccupied: isOccupiedByOtherRecurring || isOccupiedByAppointment,
          isMyClass: isMyClass
        })
        
        start = slotEnd
      }
    }
  }
  
  return weekTemplate
}

export interface MasterSlot {
  startTimeISO: string
  endTimeISO: string
  status: 'free' | 'vip_class' | 'replacement' | 'cancelled' | 'teacher_absent'
  studentName?: string
  cancellationReason?: string
  absenceReason?: string
}

export function generateMasterGrid(
  availability: any[],
  recurring: any[],
  appointments: any[],
  userTimezone: string,
  startDateUTC: Date,
  endDateUTC: Date,
  absences: any[] = []
) {
  const daysUTC = []
  let curr = new Date(startDateUTC.getTime())
  while (curr.getTime() <= endDateUTC.getTime()) {
    daysUTC.push(new Date(curr.getTime()))
    curr = new Date(curr.getTime() + 24 * 3600 * 1000)
  }

  const groupedDates: Record<string, MasterSlot[]> = {}

  for (const dateUTC of daysUTC) {
    const dayOfWeek = dateUTC.getUTCDay()
    const avails = availability.filter(a => a.day_of_week === dayOfWeek)
    
    // O dStrContext será calculado por SLOT para evitar erro da borda do fuso horário que muda de dia
    
    for (let h = 0; h < 24; h++) {
      let slotStartTime = new Date(Date.UTC(dateUTC.getUTCFullYear(), dateUTC.getUTCMonth(), dateUTC.getUTCDate(), h, 10, 0, 0))
      const slotEndTime = addMinutes(slotStartTime, 60)
      
      const slotHour = slotStartTime.getUTCHours().toString().padStart(2, '0')
      const slotMin = slotStartTime.getUTCMinutes().toString().padStart(2, '0')
      const slotTimeStr = `${slotHour}:${slotMin}:00`

      // Check if it's within availability (com suporte a cross-midnight UTC)
      const isFree = avails.some(a => {
        const [sh, sm] = a.start_time.split(':').map(Number)
        const [eh, em] = a.end_time.split(':').map(Number)
        const avStart = new Date(Date.UTC(dateUTC.getUTCFullYear(), dateUTC.getUTCMonth(), dateUTC.getUTCDate(), sh, sm, 0, 0))
        let avEnd = new Date(Date.UTC(dateUTC.getUTCFullYear(), dateUTC.getUTCMonth(), dateUTC.getUTCDate(), eh, em, 0, 0))
        // Cross-midnight: se avEnd <= avStart, projetar para o dia seguinte
        if (avEnd.getTime() <= avStart.getTime()) {
          avEnd = new Date(avEnd.getTime() + 24 * 60 * 60 * 1000)
        }
        return slotStartTime.getTime() >= avStart.getTime() && slotStartTime.getTime() < avEnd.getTime()
      })

      const recurringHit = recurring.find(r => r.day_of_week === dayOfWeek && normalizeTime(r.start_time) === slotTimeStr);
      const appointmentHit = appointments.find(a => new Date(a.start_time).getTime() === slotStartTime.getTime())
        
      const realLocalDay = formatInTimeZone(slotStartTime, userTimezone, 'yyyy-MM-dd')
      if (!groupedDates[realLocalDay]) {
         groupedDates[realLocalDay] = []
      }

      const absenceMatch = absences.find(a => a.absence_date === realLocalDay)

      let status: MasterSlot['status'] | 'unavailable' = isFree ? 'free' : 'unavailable'
      let studentName: string | undefined = undefined
      let cancellationReason: string | undefined = undefined
      let absenceReason: string | undefined = undefined

      // Prioridade: Appointments pontuais > Ausência do Professor > Recurring Fixa
      if (appointmentHit) {
        if (appointmentHit.status === 'cancelled') {
          status = 'cancelled'
          cancellationReason = appointmentHit.cancellation_reason
          studentName = appointmentHit.profiles?.full_name || 'Aluno'
        } else if (appointmentHit.status === 'scheduled') {
          status = 'replacement'
          studentName = appointmentHit.profiles?.full_name || 'Aluno'
        }
      } else if (absenceMatch) {
         status = 'teacher_absent'
         absenceReason = absenceMatch.display_reason || absenceMatch.reason
      } else if (recurringHit) {
         status = 'vip_class'
         studentName = recurringHit.profiles?.full_name || 'Aluno'
      }

      // Only push to groupedDates if it's active or free
      if (status !== 'unavailable') {
        groupedDates[realLocalDay].push({
            startTimeISO: slotStartTime.toISOString(),
            endTimeISO: slotEndTime.toISOString(),
            status: status as MasterSlot['status'],
            studentName,
            cancellationReason,
            absenceReason
          })
        }
    }
  }

  return groupedDates
}
