'use client'

import { useState } from 'react'
import { updateSubscriptionManual } from '@/app/admin/actions'

interface SubscriptionManualManagerProps {
  studentId: string
  currentStatus: string
  currentEndDate: string | null
  currentNotes: string | null
  studentName: string
}

export default function SubscriptionManualManager({ 
  studentId, 
  currentStatus, 
  currentEndDate,
  currentNotes,
  studentName 
}: SubscriptionManualManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState<'active' | 'inactive'>(currentStatus as any || 'inactive')
  const [endDate, setEndDate] = useState(currentEndDate || '')
  const [notes, setNotes] = useState(currentNotes || '')
  const [loading, setLoading] = useState(false)

  // Função para adicionar dias à data
  function addDays(days: number) {
    const baseDate = endDate ? new Date(endDate) : new Date()
    // Ajuste simples de timezone para o input date (YYYY-MM-DD)
    const localDate = new Date(baseDate.getTime() + (days * 24 * 60 * 60 * 1000))
    setEndDate(localDate.toISOString().split('T')[0])
  }

  async function handleUpdate() {
    setLoading(true)
    try {
      await updateSubscriptionManual(studentId, status, endDate || null, notes)
      setIsOpen(false)
    } catch (err) {
      alert('Erro: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="btn-outline" 
        style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', marginLeft: '0.5rem', borderColor: 'var(--primary)', color: 'var(--primary)' }}
      >
        Ajuste Manual
      </button>
    )
  }

  return (
    <div style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', 
      alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      backdropFilter: 'blur(5px)', padding: '1rem'
    }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', position: 'relative' }}>
        <button 
          onClick={() => setIsOpen(false)} 
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: 'var(--text-muted)' }}
        >
          &times;
        </button>

        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0 }}>Gestão de Assinatura</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>Aluno: <strong>{studentName}</strong></p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Status de Acesso</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as any)} style={{ width: '100%', padding: '0.75rem' }}>
              <option value="active">✅ Ativo (Acesso Liberado)</option>
              <option value="inactive">❌ Inativo (Bloqueado)</option>
            </select>
          </div>

          {/* Vencimento e Atalhos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Data de Vencimento</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: '100%', padding: '0.75rem' }} />
            
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              <button type="button" onClick={() => addDays(7)} className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.4rem', flex: 1 }}>+7d</button>
              <button type="button" onClick={() => addDays(15)} className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.4rem', flex: 1 }}>+15d</button>
              <button type="button" onClick={() => addDays(30)} className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.4rem', flex: 1 }}>+30d</button>
            </div>
            {currentEndDate && (
               <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                 Data Atual no Sistema: {new Date(currentEndDate).toLocaleDateString('pt-BR')}
               </p>
            )}
          </div>

          {/* Observações */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Observações (Opcional)</label>
            <textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Prorrogação acordada via chat..."
              rows={3}
              style={{ width: '100%', padding: '0.75rem', resize: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button className="btn-primary" onClick={handleUpdate} disabled={loading} style={{ flex: 1, height: '45px', justifyContent: 'center' }}>
              {loading ? 'Salvando...' : 'Aplicar Ajustes'}
            </button>
            <button className="btn-outline" onClick={() => setIsOpen(false)} disabled={loading} style={{ flex: 1, height: '45px', justifyContent: 'center' }}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
