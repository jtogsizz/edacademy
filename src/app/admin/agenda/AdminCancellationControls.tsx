"use client"

import { useState } from 'react'
import { cancelAppointmentByTeacher, cancelDayByTeacher, cancelRecurringClassInstance } from '../../dashboard/schedule/actions'
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
  const router = useRouter()

  const reasons = ['Feriado', 'Atestado Médico', 'Evento na Unidade', 'Problemas Técnicos', 'Imprevisto Pessoal', 'Outro']

  async function handleConfirm() {
    if (!reason) return setError('Por favor, informe o motivo.')
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
      } else if (type === 'day' && dateStr) {
        res = await cancelDayByTeacher(dateStr, reason)
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
        {type === 'day' ? 'Desmarcar Todo o Dia' : 'Cancelar Aula'}
      </button>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '450px', width: '100%', padding: '2rem' }}>
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--error)' }}>
              {type === 'day' ? 'Cancelar Dia Inteiro' : 'Cancelar Agendamento'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Esta ação enviará 1 crédito de reposição automaticamente para {type === 'day' ? 'todos os alunos afetados' : 'o aluno'}.
            </p>

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
