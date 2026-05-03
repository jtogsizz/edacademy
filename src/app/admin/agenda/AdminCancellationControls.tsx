"use client"

import { useState, useEffect } from 'react'
import { cancelAppointmentByTeacher, cancelDayByTeacher, cancelRecurringClassInstance, getTeacherActiveDays } from '../../dashboard/schedule/actions'
import { useRouter } from 'next/navigation'

interface Props {
  appointmentId?: string
  dateStr?: string // "YYYY-MM-DD"
  type: 'single' | 'day'
}

export default function AdminCancellationControls({ appointmentId, dateStr, type }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(dateStr || '')
  const router = useRouter()
  const [activeDates, setActiveDates] = useState<string[]>([])

  useEffect(() => {
    if (showModal && type === 'day') {
      getTeacherActiveDays().then(res => {
        if (res?.data) {
          setActiveDates(res.data)
          if (res.data.length > 0 && !selectedDate) {
            setSelectedDate(res.data[0])
          }
        }
      })
    }
  }, [showModal, type])

  const dayReasons = ['Feriado', 'Atestado Médico', 'Imprevisto Pessoal', 'Problemas Técnicos', 'Outro']
  const singleReasons = ['Feriado', 'Atestado Médico', 'Problemas Técnicos', 'Imprevisto Pessoal', 'Aluno não compareceu', 'Outro']
  const reasons = type === 'day' ? dayReasons : singleReasons

  async function handleConfirm() {
    if (!reason) return setError('Por favor, informe o motivo.')
    if (type === 'day' && !selectedDate) return setError('Por favor, selecione o dia.')
    setLoading(true)
    setError(null)

    try {
      let res
      if (type === 'single' && appointmentId) {
        if (appointmentId.startsWith('rec-')) {
          res = await cancelRecurringClassInstance(appointmentId, reason)
        } else {
          res = await cancelAppointmentByTeacher(appointmentId, reason)
        }
      } else if (type === 'day') {
        res = await cancelDayByTeacher(selectedDate, reason)
      }

      if (res?.error) {
        setError(res.error)
      } else {
        setShowModal(false)
        router.refresh()
      }
    } catch (e) {
      setError('Ocorreu um erro ao processar o cancelamento.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setShowModal(true)} 
        className={type === 'day' ? "btn-outline" : "btn-link"}
        style={{ 
          fontSize: '0.85rem', 
          color: 'var(--error)', 
          borderColor: type === 'day' ? 'var(--error)' : 'transparent',
          padding: type === 'day' ? '0.5rem 1rem' : '0.25rem',
          cursor: 'pointer'
        }}
      >
        {type === 'day' ? 'Desmarcar Dia Inteiro' : 'Cancelar Aula'}
      </button>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '450px', width: '100%', padding: '2rem' }}>
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--error)' }}>
              {type === 'day' ? 'Cancelar Dia Inteiro' : 'Cancelar Agendamento'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {reason === 'Aluno não compareceu'
                ? 'Esta ação registrará a ausência. Nenhum crédito será gerado ao aluno.'
                : `Esta ação enviará 1 crédito de reposição automaticamente para ${type === 'day' ? 'todos os alunos afetados' : 'o aluno'}.`
              }
            </p>
            {reason === 'Aluno não compareceu' && (
              <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-md)', padding: '0.65rem 1rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: 'var(--error)', fontWeight: 500 }}>
                Nenhum crédito de reposição será adicionado ao aluno.
              </div>
            )}

            {type === 'day' && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 600 }}>Dia a Cancelar</label>
                <select
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
                >
                  <option value="" disabled>Selecione um dia com aulas...</option>
                  {activeDates.map(d => (
                    <option key={d} value={d}>
                      {new Date(d + 'T12:00:00Z').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                    </option>
                  ))}
                </select>
                {activeDates.length === 0 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Buscando dias ativos da agenda...</div>
                )}
              </div>
            )}

            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 600 }}>Motivo do Cancelamento</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              {reasons.map(r => (
                <button 
                  key={r}
                  onClick={() => setReason(r)}
                  style={{ 
                    padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '20px', border: '1px solid var(--border)',
                    backgroundColor: reason === r ? 'var(--primary)' : 'var(--bg-main)',
                    color: reason === r ? 'white' : 'var(--text-main)',
                    cursor: 'pointer'
                  }}
                >
                  {r}
                </button>
              ))}
            </div>

            <textarea 
              placeholder="Descreva o motivo ou observação..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', height: '80px', marginBottom: '1.5rem' }}
            />

            {error && <div style={{ color: 'var(--error)', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</div>}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowModal(false)} 
                className="btn-outline" 
                disabled={loading}
                style={{ padding: '0.6rem 1.2rem' }}
              >
                Voltar
              </button>
              <button 
                onClick={handleConfirm} 
                className="btn-primary" 
                disabled={loading || !reason}
                style={{ padding: '0.6rem 1.5rem', backgroundColor: 'var(--error)' }}
              >
                {loading ? 'Processando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
