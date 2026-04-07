"use client"

import { useState, useEffect } from 'react'
import { getTeacherAvailabilityTemplate, addRecurringClass } from '../schedule/actions'
import { useRouter } from 'next/navigation'

interface Props {
  teachers: { id: string; full_name: string }[]
}

const daysLabels = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export default function RecurringClassForm({ teachers }: Props) {
  const [selectedTeacher, setSelectedTeacher] = useState('')
  const [template, setTemplate] = useState<Record<number, any[]>>({})
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (selectedTeacher) {
      loadTemplate(selectedTeacher)
    } else {
      setTemplate({})
    }
  }, [selectedTeacher])

  async function loadTemplate(teacherId: string) {
    setLoading(true)
    setError(null)
    const res = await getTeacherAvailabilityTemplate(teacherId)
    if (res.error) {
      setError(res.error)
    } else if (res.data) {
      setTemplate(res.data)
    }
    setLoading(false)
  }

  async function handleAdd(day: number, time: string) {
    if (!selectedTeacher) return
    setSubmitting(true)
    setError(null)
    
    const res = await addRecurringClass(day, time, selectedTeacher)
    if (res.error) {
      setError(res.error)
      setSubmitting(false)
    } else {
      router.refresh()
      setSubmitting(false)
    }
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-main)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
      <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Novo Horário Fixo</h4>
      
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>1. Selecione o Professor</label>
        <select 
          value={selectedTeacher} 
          onChange={e => setSelectedTeacher(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
        >
          <option value="">Selecione um docente...</option>
          {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
        </select>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.85rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          {error}
        </div>
      )}

      {loading && <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Carregando horários disponíveis...</div>}

      {!loading && selectedTeacher && (
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>2. Escolha um horário livre na semana</label>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {daysLabels.map((label, dayIdx) => {
              const slots = template[dayIdx] || []
              if (slots.length === 0) return null

              return (
                <div key={dayIdx} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--primary)' }}>{label}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem' }}>
                    {slots.map((slot, sIdx) => (
                      <button
                        key={sIdx}
                        disabled={submitting}
                        onClick={() => handleAdd(dayIdx, slot.start)}
                        className="btn-outline hover-fx"
                        style={{ 
                          padding: '0.5rem', 
                          fontSize: '0.8rem', 
                          textAlign: 'center',
                          opacity: submitting ? 0.6 : 1
                        }}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
            
            {Object.values(template).every(s => s.length === 0) && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Este professor não possui horários disponíveis no momento.
              </div>
            )}
          </div>
        </div>
      )}

      {!selectedTeacher && (
        <div style={{ textAlign: 'center', padding: '2rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Selecione um professor para visualizar a disponibilidade semanal.
        </div>
      )}
    </div>
  )
}
