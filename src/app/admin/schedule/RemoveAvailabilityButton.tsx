"use client"

import { useState, useTransition } from 'react'
import { removeAvailability } from './actions'

interface AffectedStudent {
  recurringId: string
  studentId: string
  studentName: string
  startTime: string
}

interface RemoveAvailabilityButtonProps {
  availabilityId: string
  displayTime: string // ex: "07:00 → 21:00" — só para contexto no confirm
}

export function RemoveAvailabilityButton({ availabilityId, displayTime }: RemoveAvailabilityButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [confirmState, setConfirmState] = useState<{
    show: boolean
    affectedStudents: AffectedStudent[]
  }>({ show: false, affectedStudents: [] })
  const [error, setError] = useState<string | null>(null)

  function handleInitialClick() {
    setError(null)
    startTransition(async () => {
      const res = await removeAvailability(availabilityId, false)

      if (res?.error) {
        setError(res.error)
        return
      }

      if (res?.needsConfirmation) {
        // Há alunos fixos — mostrar aviso de confirmação
        setConfirmState({ show: true, affectedStudents: res.affectedStudents ?? [] })
        return
      }

      // Sem alunos afetados — removido diretamente (revalidatePath já aconteceu no server)
    })
  }

  function handleCancel() {
    setConfirmState({ show: false, affectedStudents: [] })
    setError(null)
  }

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const res = await removeAvailability(availabilityId, true)
      if (res?.error) {
        setError(res.error)
      } else {
        setConfirmState({ show: false, affectedStudents: [] })
      }
    })
  }

  if (confirmState.show) {
    return (
      <div className="remov-confirm-box">
        <div className="remov-confirm-header">
          <span className="remov-warn-icon">⚠️</span>
          <strong>Confirmar remoção de expediente</strong>
        </div>
        <p className="remov-confirm-text">
          O bloco <strong>{displayTime}</strong> possui {confirmState.affectedStudents.length}{' '}
          {confirmState.affectedStudents.length === 1 ? 'aluno' : 'alunos'} com aula fixa:
        </p>
        <ul className="remov-student-list">
          {confirmState.affectedStudents.map(s => (
            <li key={s.recurringId}>
              <strong>{s.studentName}</strong>
              <span className="remov-time-badge">{s.startTime.substring(0, 5)}</span>
            </li>
          ))}
        </ul>
        <p className="remov-confirm-consequence">
          Ao confirmar, as próximas 4 ocorrências de cada aula fixa serão canceladas e os créditos creditados automaticamente. Os alunos serão notificados e poderão escolher um novo horário.
        </p>
        <div className="remov-confirm-actions">
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="remov-btn-cancel"
          >
            Voltar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isPending}
            className="remov-btn-confirm"
          >
            {isPending ? (
              <span className="remov-spinner" />
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            )}
            {isPending ? 'Processando…' : 'Confirmar remoção'}
          </button>
        </div>
        {error && <div className="remov-error">{error}</div>}
        <style dangerouslySetInnerHTML={{ __html: CONFIRM_STYLES }} />
      </div>
    )
  }

  return (
    <>
      <button
        onClick={handleInitialClick}
        disabled={isPending}
        title="Remover bloco"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
          padding: '0.4rem 0.75rem', borderRadius: 8,
          background: 'transparent', border: '1px solid transparent',
          color: 'var(--error, #DC2626)', cursor: 'pointer',
          fontSize: '0.78rem', fontWeight: 600, fontFamily: 'inherit',
          transition: 'background 0.15s, border-color 0.15s',
          opacity: isPending ? 0.5 : 1,
        }}
        className="sched-remove-btn"
      >
        {isPending ? (
          <span className="remov-spinner remov-spinner-sm" />
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        )}
        {isPending ? 'Verificando…' : 'Remover'}
      </button>
      {error && <div className="remov-error-inline">{error}</div>}
      <style dangerouslySetInnerHTML={{ __html: CONFIRM_STYLES }} />
    </>
  )
}

const CONFIRM_STYLES = `
  .remov-confirm-box {
    background: var(--bg-card, #fff);
    border: 1.5px solid rgba(245,158,11,0.35);
    border-radius: 12px;
    padding: 1.1rem 1.25rem;
    margin: 0.5rem 0;
    animation: remov-slide-in 0.15s ease;
  }
  @keyframes remov-slide-in {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .remov-confirm-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.88rem;
    font-weight: 700;
    color: var(--text-main);
    margin-bottom: 0.6rem;
  }
  .remov-warn-icon { font-size: 1rem; }
  .remov-confirm-text {
    font-size: 0.83rem;
    color: var(--text-muted);
    margin: 0 0 0.5rem;
  }
  .remov-student-list {
    list-style: none;
    padding: 0;
    margin: 0 0 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  .remov-student-list li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.83rem;
    font-weight: 600;
  }
  .remov-time-badge {
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.1rem 0.45rem;
    border-radius: 99px;
    background: rgba(234,88,12,0.08);
    color: var(--primary);
    border: 1px solid rgba(234,88,12,0.2);
    font-family: monospace;
  }
  .remov-confirm-consequence {
    font-size: 0.78rem;
    color: var(--text-muted);
    margin: 0 0 0.85rem;
    line-height: 1.5;
  }
  .remov-confirm-actions {
    display: flex;
    gap: 0.6rem;
    align-items: center;
  }
  .remov-btn-cancel {
    padding: 0.45rem 1rem;
    border-radius: 8px;
    border: 1.5px solid var(--border);
    background: transparent;
    color: var(--text-muted);
    font-size: 0.82rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.15s;
  }
  .remov-btn-cancel:hover:not(:disabled) { background: var(--bg-main); }
  .remov-btn-confirm {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 1rem;
    border-radius: 8px;
    border: none;
    background: #DC2626;
    color: #fff;
    font-size: 0.82rem;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .remov-btn-confirm:hover:not(:disabled) { opacity: 0.88; }
  .remov-btn-confirm:disabled, .remov-btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }
  .remov-spinner {
    display: inline-block;
    width: 14px; height: 14px;
    border: 2px solid rgba(255,255,255,0.35);
    border-top-color: #fff;
    border-radius: 50%;
    animation: remov-spin 0.7s linear infinite;
  }
  .remov-spinner-sm {
    border-color: rgba(220,38,38,0.25);
    border-top-color: #DC2626;
    width: 12px; height: 12px;
  }
  @keyframes remov-spin { to { transform: rotate(360deg); } }
  .remov-error {
    margin-top: 0.6rem;
    padding: 0.5rem 0.75rem;
    border-radius: 7px;
    background: rgba(239,68,68,0.08);
    border: 1px solid rgba(239,68,68,0.2);
    color: #DC2626;
    font-size: 0.8rem;
    font-weight: 500;
  }
  .remov-error-inline {
    font-size: 0.78rem;
    color: #DC2626;
    font-weight: 500;
    margin-top: 0.25rem;
  }
  .sched-remove-btn:hover:not(:disabled) {
    background: rgba(220,38,38,0.07) !important;
    border-color: rgba(220,38,38,0.2) !important;
  }
`
