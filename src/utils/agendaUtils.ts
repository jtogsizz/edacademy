import { addDays, addWeeks, format, getDay, isAfter, isBefore, parseISO, startOfDay } from 'date-fns'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'

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
    // Usar lógica estrita em UTC
    const [h, m, s] = rec.start_time.split(':').map(Number)
    const [eh, em, es] = rec.end_time.split(':').map(Number)
    
    // Iniciar a partir de 'hoje' em puro UTC
    const nowUTC = new Date()
    let currentUTC = new Date(Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth(), nowUTC.getUTCDate(), h, m, s || 0, 0))
    
    // Avançar até o dia da semana da recorrência em UTC
    while (currentUTC.getUTCDay() !== rec.day_of_week) {
      currentUTC = new Date(currentUTC.getTime() + 24 * 60 * 60 * 1000)
    }

    // Se a data calculada for muito para trás na semana, ajuste para a atual
    if (currentUTC.getTime() < nowUTC.getTime() - 7 * 24 * 60 * 60 * 1000) {
      currentUTC = new Date(currentUTC.getTime() + 7 * 24 * 60 * 60 * 1000)
    }

    const endLimitUTC = new Date(nowUTC.getTime() + daysAhead * 24 * 60 * 60 * 1000)

    // Gerar instâncias semanais
    while (currentUTC.getTime() < endLimitUTC.getTime()) {
      const instanceStart = new Date(currentUTC.getTime())
      const instanceEnd = new Date(currentUTC.getTime())
      instanceEnd.setUTCHours(eh, em, es || 0, 0)

      const instanceStartISO = instanceStart.toISOString()

      // Verificar se essa data específica já tem um appointment manual que sobrescreve
      // (Se houver um appointment no mesmo start_time, ele "vence" a recorrência)
      const override = oneOffAppointments.find(a => a.start_time === instanceStartISO)

      // Manter visível até o término da aula (não só enquanto não começou)
      if (!override && instanceEnd > new Date()) {
        agenda.push({
          id: `rec-${rec.id}-${instanceStartISO}`,
          start_time: instanceStartISO,
          end_time: instanceEnd.toISOString(),
          status: 'scheduled',
          teacher: rec.teacher,
          is_recurring: true
        })
      }

      currentUTC = new Date(currentUTC.getTime() + 7 * 24 * 60 * 60 * 1000)
    }
  }

  // Ordenar cronologicamente
  return agenda.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
}

/**
 * Converte um Dia e Hora do fuso horário Local do Professor para o UTC absoluto.
 * O Banco de dados vai passar a armazenar este output limpo.
 */
export function localToUtcTime(dayOfWeek: number, timeStr: string, userTimezone: string) {
  const refDate = new Date()
  let targetDateStr = ""
  
  // Procura na semana atual o primeiro dia que caia no "dayOfWeek" DO TIMEZONE do professor
  for(let i=0; i<=7; i++) {
     const d = new Date(refDate.getTime() + i * 24 * 3600 * 1000)
     const dayStr = formatInTimeZone(d, userTimezone, 'i') // 1=Mon, 7=Sun
     const dayNum = parseInt(dayStr) === 7 ? 0 : parseInt(dayStr)
     if (dayNum === dayOfWeek) {
        targetDateStr = formatInTimeZone(d, userTimezone, 'yyyy-MM-dd')
        break
     }
  }
  
  const localDateTimeStr = `${targetDateStr}T${timeStr}:00`
  const utcDate = fromZonedTime(localDateTimeStr, userTimezone)
  
  return {
     utcDay: utcDate.getUTCDay(),
     utcTime: `${utcDate.getUTCHours().toString().padStart(2, '0')}:${utcDate.getUTCMinutes().toString().padStart(2, '0')}:00`
  }
}

/**
 * Converte a regra gravada em banco (UTC) de volta para o Local do professor para exibição na painel de Config.
 */
export function utcToLocalTime(utcDayOfWeek: number, timeStr: string, userTimezone: string) {
  const nowUTC = new Date()
  let targetDateStr = ""
  
  for(let i=0; i<=7; i++) {
     const d = new Date(nowUTC.getTime() + i * 24 * 3600 * 1000)
     if (d.getUTCDay() === utcDayOfWeek) {
        targetDateStr = `${d.getUTCFullYear()}-${(d.getUTCMonth()+1).toString().padStart(2, '0')}-${d.getUTCDate().toString().padStart(2, '0')}`
        break
     }
  }
  
  const absDate = new Date(`${targetDateStr}T${timeStr}Z`)
  
  const localDayStr = formatInTimeZone(absDate, userTimezone, 'i')
  const localDayNum = parseInt(localDayStr) === 7 ? 0 : parseInt(localDayStr)
  
  return {
     localDay: localDayNum,
     localTime: formatInTimeZone(absDate, userTimezone, 'HH:mm')
  }
}
