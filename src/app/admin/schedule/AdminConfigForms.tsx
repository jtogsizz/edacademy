"use client"

import { useState } from 'react'
import { addAvailability, addRecurringClass } from './actions'

export function AvailabilityForm() {
  const [day, setDay] = useState("1")
  const [start, setStart] = useState("07:00")
  const [end, setEnd] = useState("21:00")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await addAvailability(Number(day), start, end)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', backgroundColor: 'var(--bg-main)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
      <p style={{ width: '100%', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
        Dica: Adicione mais de um bloco para o mesmo dia para incluir pausas (ex: almoço ou descanso).
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '150px' }}>
        <label>Dia da Semana</label>
        <select value={day} onChange={e => setDay(e.target.value)} required>
          <option value="0">Domingo</option>
          <option value="1">Segunda-feira</option>
          <option value="2">Terça-feira</option>
          <option value="3">Quarta-feira</option>
          <option value="4">Quinta-feira</option>
          <option value="5">Sexta-feira</option>
          <option value="6">Sábado</option>
        </select>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '100px' }}>
        <label>Horário Inicial</label>
        <input type="time" value={start} onChange={e => setStart(e.target.value)} required />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '100px' }}>
        <label>Horário Final</label>
        <input type="time" value={end} onChange={e => setEnd(e.target.value)} required />
      </div>
      <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '0.75rem 1.5rem', height: 'fit-content' }}>
        Salvar Expediente
      </button>
    </form>
  )
}
