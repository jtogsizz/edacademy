"use client"

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useRouter, useSearchParams } from 'next/navigation'
import { bookSlot, rescheduleAppointment } from './actions'
import type { Slot } from './ScheduleEngine'

export default function BookingCalendar({ 
  groupedDates, 
  teacherId 
}: { 
  groupedDates: Record<string, Slot[]>, 
  teacherId: string 
}) {
  const searchParams = useSearchParams()
  const rescheduleId = searchParams.get('reschedule_id')
  const router = useRouter()

  const dates = Object.keys(groupedDates).sort()
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(dates[0] || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAction = async (start: string, end: string) => {
    setLoading(true)
    setError(null)
    
    try {
      let res;
      if (rescheduleId) {
        res = await rescheduleAppointment(rescheduleId, start, end)
      } else {
        res = await bookSlot(start, end, teacherId)
      }

      if (res?.error) {
        setError(res.error)
        setLoading(false)
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      setError('Ocorreu um erro ao processar seu agendamento.')
      setLoading(false)
    }
  }

  if (dates.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Sem agenda configurada</h3>
        <p style={{ color: 'var(--text-muted)' }}>O professor ainda não abriu os horários do mês.</p>
      </div>
    )
  }

  const selectedSlots = selectedDateStr ? groupedDates[selectedDateStr] : []

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '2rem', alignItems: 'start' }}>
      
      {/* Esquerda: Lista de Datas */}
      <div className="card" style={{ padding: '1.5rem 1rem' }}>
        <h3 style={{ marginBottom: '1rem', paddingLeft: '0.5rem' }}>Datas Disponíveis</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '600px', overflowY: 'auto', paddingRight: '0.5rem' }}>
          {dates.map(dateStr => {
            const dateObj = parseISO(dateStr)
            const isSelected = selectedDateStr === dateStr
            const slots = groupedDates[dateStr]
            const allOccupied = slots.length > 0 && slots.every(s => s.status !== 'free')
            const emptyDay = slots.length === 0

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDateStr(dateStr)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  backgroundColor: isSelected ? 'var(--primary)' : 'var(--bg-main)',
                  color: isSelected ? '#fff' : 'var(--text-main)',
                  border: isSelected ? 'none' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  opacity: emptyDay ? 0.5 : 1
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1.05rem', textTransform: 'capitalize' }}>
                    {format(dateObj, "dd 'de' MMM", { locale: ptBR })}
                  </div>
                  <div style={{ fontSize: '0.8rem', opacity: isSelected ? 0.9 : 0.6, textTransform: 'capitalize' }}>
                    {format(dateObj, "EEEE", { locale: ptBR })}
                  </div>
                </div>
                {allOccupied && !emptyDay && (
                  <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--error)', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '10px' }}>Lotado</span>
                )}
                {emptyDay && (
                  <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', padding: '0.2rem 0.5rem', borderRadius: '10px' }}>Inativo</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Direita: Horários do Dia */}
      <div className="card" style={{ minHeight: '400px' }}>
        {selectedDateStr && (
          <>
            <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <h3 style={{ textTransform: 'capitalize' }}>
                {format(parseISO(selectedDateStr), "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </h3>
              {rescheduleId && (
                <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#d97706', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginTop: '0.75rem', border: '1px solid rgba(245, 158, 11, 0.2)', fontSize: '0.85rem' }}>
                  <strong>Modo Reposição:</strong> Escolha um novo horário para sua aula.
                </div>
              )}
            </div>

            {error && <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
              {selectedSlots.map((slot, idx) => {
                const prepStart = format(parseISO(slot.prepStartTimeISO), "HH:mm")
                const classStart = format(parseISO(slot.classStartTimeISO), "HH:mm")

                if (slot.status === 'free') {
                  return (
                    <button 
                      key={idx} 
                      onClick={() => handleAction(slot.startTimeISO, slot.endTimeISO)}
                      disabled={loading}
                      className="btn-outline hover-fx"
                      style={{ padding: '0', display: 'flex', flexDirection: 'column', border: '1px solid var(--primary)', overflow: 'hidden', height: 'fit-content' }}
                    >
                      <div style={{ backgroundColor: 'rgba(52, 211, 153, 0.1)', color: '#059669', fontSize: '0.7rem', padding: '0.35rem', width: '100%', textAlign: 'center', borderBottom: '1px solid rgba(52, 211, 153, 0.2)' }}>
                        Preparação: {prepStart}
                      </div>
                      <div style={{ padding: '0.85rem', textAlign: 'center', width: '100%' }}>
                        <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-main)' }}>{classStart}</div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--primary)' }}>Livre: Agendar</span>
                      </div>
                    </button>
                  )
                }

                if (slot.status === 'my_class') {
                  return (
                    <div key={idx} style={{ padding: '0', textAlign: 'center', backgroundColor: 'var(--primary)', color: '#fff', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary)', opacity: 0.9, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', fontSize: '0.7rem', padding: '0.35rem' }}>Preparação: {prepStart}</div>
                      <div style={{ padding: '0.85rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{classStart}</div>
                        <span style={{ display: 'block', fontSize: '0.7rem', marginTop: '0.2rem', fontWeight: 600 }}>Sua Aula!</span>
                      </div>
                    </div>
                  )
                }

                return (
                  <div key={idx} style={{ padding: '0', textAlign: 'center', backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', opacity: 0.7, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ backgroundColor: 'var(--bg-card)', fontSize: '0.7rem', padding: '0.35rem' }}>{prepStart}</div>
                    <div style={{ padding: '0.85rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '1.2rem', textDecoration: 'line-through' }}>{classStart}</div>
                      <span style={{ display: 'block', fontSize: '0.7rem' }}>Indisponível</span>
                    </div>
                  </div>
                )
              })}

              {selectedSlots.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 0' }}>
                  Nenhum horário disponível para este dia.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 768px) {
          div[style*="grid-template-columns: minmax(300px, 1fr) 2fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}} />
    </div>
  )
}
