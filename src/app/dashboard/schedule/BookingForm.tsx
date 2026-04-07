"use client"
import { CalendarDays } from 'lucide-react'

import { useState } from 'react'
import { bookSlot } from './actions'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function BookingForm({ groupedDates }: { groupedDates: Record<string, { startTimeISO: string, endTimeISO: string }[]> }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)
  const router = useRouter()

  const dates = Object.keys(groupedDates).sort()

  const handleBook = async (start: string, end: string) => {
    setLoading(true)
    setError(null)
    const res = await bookSlot(start, end)
    
    if (res?.error) {
      setError(res.error)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  if (dates.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Sem horários disponíveis</h3>
        <p style={{ color: 'var(--text-muted)' }}>O professor não possui horários livres nos próximos 14 dias ou eles já foram todos reservados.</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <CalendarDays size={20} style={{ color: 'var(--primary)' }} /> Próximos 14 dias
      </h3>
      
      {error && <div style={{ backgroundColor: 'var(--error-bg)', color: 'var(--error)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {dates.map(dateStr => {
          const slots = groupedDates[dateStr]
          // The key represents the local date string like "2023-12-01"
          const dateObj = parseISO(dateStr)

          return (
            <div key={dateStr} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--primary)', textTransform: 'capitalize' }}>
                {format(dateObj, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </h4>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {slots.map((s, idx) => {
                  const sObj = parseISO(s.startTimeISO)
                  const timeLabel = format(sObj, "HH:mm", { locale: ptBR })

                  return (
                    <button 
                      key={idx} 
                      onClick={() => handleBook(s.startTimeISO, s.endTimeISO)}
                      disabled={loading}
                      className="btn-outline"
                      style={{ 
                        padding: '0.75rem 1.5rem', 
                        fontWeight: 600, 
                        borderColor: 'var(--primary)', 
                        color: 'var(--text-main)',
                        backgroundColor: 'var(--bg-main)'
                      }}
                    >
                      {timeLabel}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
