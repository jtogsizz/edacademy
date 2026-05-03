'use client'

import { useState, useEffect, useMemo } from 'react'
import { fetchMasterGridData, GridSlot } from './actions'
import { startOfWeek, addWeeks, subWeeks, endOfWeek, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatInTimeZone } from 'date-fns-tz'

// Horas padrão a exibir na grade (linhas da planilha)
// Cada hora representa um "balde" — qualquer aula que comece entre HH:00 e HH:59 aparece nessa linha.
export const STANDARD_HOURS = [
  '06', '07', '08', '09', '10', '11',
  '12', '13', '14', '15', '16', '17',
  '18', '19', '20', '21', '22',
]

interface MasterGridProps {
  teachers: { id: string; full_name: string }[]
  initialTimezone: string
}

export default function MasterGrid({ teachers, initialTimezone }: MasterGridProps) {
  const [selectedTeacher, setSelectedTeacher] = useState(teachers[0]?.id || '')
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [gridData, setGridData] = useState<Record<string, GridSlot[]>>({})
  const [loading, setLoading] = useState(true)

  const weekDays = useMemo(() => {
    const days = []
    for (let i = 0; i < 7; i++) {
      days.push(new Date(currentWeekStart.getTime() + i * 24 * 60 * 60 * 1000))
    }
    return days
  }, [currentWeekStart])

  useEffect(() => {
    if (!selectedTeacher) return
    let isMounted = true

    async function loadData() {
      setGridData({}) // Limpar dados antigos imediatamente ao iniciar novo carregamento
      setLoading(true)
      const startIso = currentWeekStart.toISOString()
      const endIso = endOfWeek(currentWeekStart, { weekStartsOn: 1 }).toISOString()
      const res = await fetchMasterGridData(selectedTeacher, startIso, endIso, initialTimezone)
      if (isMounted) {
        if (res.data) setGridData(res.data)
        else setGridData({})
        setLoading(false)
      }
    }
    loadData()
    return () => {
      isMounted = false
    }
  }, [selectedTeacher, currentWeekStart, initialTimezone])

  const goPrevWeek = () => setCurrentWeekStart((w) => subWeeks(w, 1))
  const goNextWeek = () => setCurrentWeekStart((w) => addWeeks(w, 1))

  // Encontra um slot cujo horário de início cai na hora `hour` do dia `dateUTC` (no timezone do admin)
  const getSlotForCell = (dateUTC: Date, hour: string): GridSlot | null => {
    const dateStr = formatInTimeZone(dateUTC, initialTimezone, 'yyyy-MM-dd')
    const daySlots = gridData[dateStr]
    if (!daySlots) return null
    return (
      daySlots.find(
        (s) => formatInTimeZone(new Date(s.start_time), initialTimezone, 'HH') === hour
      ) ?? null
    )
  }

  const renderCellContent = (slot: GridSlot | null) => {
    if (!slot) return null

    let bgColor = 'transparent'
    let textColor = 'var(--text-main)'
    let border = 'none'
    let label = ''

    if (slot.status === 'cancelled') {
      bgColor = '#fee2e2'
      textColor = '#991b1b'
      border = '1px dashed #ef4444'
      label = 'Cancelada'
    } else if (slot.is_recurring) {
      // Aula fixa (recorrente)
      bgColor = 'var(--primary)'
      textColor = '#ffffff'
      label = 'Aula Fixa'
    } else {
      // Appointment pontual (reposição / extra)
      bgColor = '#10b981'
      textColor = '#ffffff'
      label = 'Reposição'
    }

    // Horário real da aula no timezone do admin
    const timeDisplay = formatInTimeZone(new Date(slot.start_time), initialTimezone, 'HH:mm')

    return (
      <div
        style={{
          height: '100%',
          width: '100%',
          padding: '0.2rem 0.3rem',
          backgroundColor: bgColor,
          color: textColor,
          border,
          borderRadius: '4px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          fontSize: '0.65rem',
          overflow: 'hidden',
          lineHeight: 1.2,
        }}
      >
        <strong style={{ display: 'block', fontSize: '0.62rem', opacity: 0.85 }}>
          {label} · {timeDisplay}
        </strong>
        {slot.studentName && (
          <span
            style={{
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginTop: '1px',
            }}
          >
            {slot.studentName}
          </span>
        )}
        {slot.cancellation_reason && (
          <span
            style={{
              opacity: 0.75,
              fontSize: '0.6rem',
              marginTop: '1px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {slot.cancellation_reason}
          </span>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Controles */}
      <div
        className="card"
        style={{
          marginBottom: '1rem',
          padding: '0.75rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          backgroundColor: 'var(--bg-main)',
          border: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          {/* Seletor de Professor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Selecionar Professor
            </label>
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-main)',
                color: 'var(--text-main)',
                border: '1px solid var(--border)',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Navegação de Semana */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              className="btn-outline"
              onClick={goPrevWeek}
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
            >
              ← Semana Anterior
            </button>
            <button
              className="btn-outline"
              onClick={goNextWeek}
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
            >
              Próxima Semana →
            </button>
            <div
              style={{
                marginLeft: '1rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'var(--text-main)',
              }}
            >
              {format(currentWeekStart, 'dd/MMM', { locale: ptBR })} —{' '}
              {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'dd/MMM', { locale: ptBR })}
            </div>
          </div>
        </div>

        {/* Legenda */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
          {[
            { color: 'var(--primary)', label: 'Aula Fixa' },
            { color: '#10b981', label: 'Reposição / Extra' },
            { color: '#fee2e2', border: '1px dashed #ef4444', label: 'Cancelada', text: '#991b1b' },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  backgroundColor: item.color,
                  border: item.border,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grade */}
      <div
        style={{
          overflowX: 'auto',
          backgroundColor: 'var(--bg-main)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Mapeando agenda ao vivo...
          </div>
        ) : (
          <div style={{ minWidth: '900px', display: 'flex', flexDirection: 'column' }}>
            {/* Cabeçalho dos Dias */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '52px repeat(7, 1fr)',
                borderBottom: '1px solid var(--border)',
                backgroundColor: 'var(--bg-hover)',
              }}
            >
              <div style={{ padding: '0.5rem', borderRight: '1px solid var(--border)' }} />
              {weekDays.map((date, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '0.3rem',
                    textAlign: 'center',
                    borderRight: idx < 6 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      fontSize: '0.75rem',
                      textTransform: 'capitalize',
                    }}
                  >
                    {format(date, 'EEE', { locale: ptBR })}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {format(date, 'dd/MM')}
                  </div>
                </div>
              ))}
            </div>

            {/* Linhas de Horário */}
            {STANDARD_HOURS.map((hour, rIdx) => (
              <div
                key={hour}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '52px repeat(7, 1fr)',
                  borderBottom:
                    rIdx < STANDARD_HOURS.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                {/* Coluna da hora */}
                <div
                  style={{
                    padding: '0.2rem',
                    textAlign: 'center',
                    borderRight: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                  }}
                >
                  {hour}h
                </div>

                {/* Células de cada dia */}
                {weekDays.map((date, cIdx) => {
                  const slot = getSlotForCell(date, hour)
                  return (
                    <div
                      key={cIdx}
                      style={{
                        minHeight: '44px',
                        padding: '0.15rem',
                        borderRight: cIdx < 6 ? '1px solid var(--border)' : 'none',
                        backgroundColor: slot ? 'transparent' : 'rgba(128,128,128,0.02)',
                      }}
                    >
                      {renderCellContent(slot)}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
