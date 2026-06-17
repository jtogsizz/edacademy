"use client"
import { useState } from 'react'
import { addAvailability } from './actions'

export default function ScheduleForm() {
  const [day, setDay] = useState("1") // Padrão: Segunda-feira
  const [time, setTime] = useState("07:00")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Apenas horas fechadas permitidas (07:00 – 22:00)
  const HOURS = Array.from({ length: 16 }, (_, i) => {
    const h = (i + 7).toString().padStart(2, '0')
    return `${h}:00`
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    
    if (!time) {
      setError("Selecione um horário inicial.")
      setLoading(false)
      return
    }

    // Garantia extra no frontend: apenas horas fechadas
    const [h, m] = time.split(':').map(Number)
    if (m !== 0) {
      setError('Use apenas horários fechados, como 07:00 ou 14:00.')
      setLoading(false)
      return
    }
    const endHour = (h + 1).toString().padStart(2, '0')
    const endTime = `${endHour}:00`

    const res = await addAvailability(Number(day), time, endTime)
    if (res?.error) {
      setError(res.error)
    } else {
      setSuccess("Horário adicionado com sucesso!")
      setTime("")
      setTimeout(() => setSuccess(null), 3000)
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', backgroundColor: 'var(--bg-main)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
      {error && <div style={{ color: 'var(--error)' }}>{error}</div>}
      {success && <div style={{ color: 'var(--success)' }}>{success}</div>}
      
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Dia da Semana</label>
          <select value={day} onChange={e => setDay(e.target.value)} required style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border)' }}>
            <option value="0">Domingo</option>
            <option value="1">Segunda-feira</option>
            <option value="2">Terça-feira</option>
            <option value="3">Quarta-feira</option>
            <option value="4">Quinta-feira</option>
            <option value="5">Sexta-feira</option>
            <option value="6">Sábado</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Horário de Início</label>
          <select
            value={time}
            onChange={e => setTime(e.target.value)}
            required
            style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border)', width: '100%' }}
          >
            {HOURS.map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '0.75rem 2rem' }}>
          {loading ? 'Adicionando...' : '+ Cadastrar Horário Livre'}
        </button>
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>A aula terá duração automática de 60 minutos.</p>
    </form>
  )
}
