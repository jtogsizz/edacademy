"use client"

import { useState, useTransition } from 'react'
import { addAvailability } from './actions'

const DIAS = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
]

export function AvailabilityForm() {
  const [day, setDay] = useState('1')
  const [start, setStart] = useState('07:00')
  const [end, setEnd] = useState('21:00')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const endBeforeStart = end <= start

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (endBeforeStart) return
    setError(null)
    startTransition(async () => {
      const res = await addAvailability(Number(day), start, end)
      if (res?.error) setError(res.error)
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Grid de campos em linha */}
      <div className="avail-form-grid">
        {/* Dia */}
        <div className="avail-field">
          <label className="avail-label">Dia da semana</label>
          <select
            value={day}
            onChange={e => setDay(e.target.value)}
            className="avail-input"
            required
          >
            {DIAS.map((d, i) => (
              <option key={i} value={String(i)}>{d}</option>
            ))}
          </select>
        </div>

        {/* Hora início */}
        <div className="avail-field">
          <label className="avail-label">Início</label>
          <input
            type="time"
            value={start}
            onChange={e => setStart(e.target.value)}
            className="avail-input"
            required
          />
        </div>

        {/* Hora fim */}
        <div className="avail-field">
          <label className="avail-label">
            Fim
            {endBeforeStart && (
              <span className="avail-time-warn">⚠ Fim deve ser maior que início</span>
            )}
          </label>
          <input
            type="time"
            value={end}
            onChange={e => setEnd(e.target.value)}
            className={`avail-input ${endBeforeStart ? 'avail-input-error' : ''}`}
            required
          />
        </div>

        {/* Botão */}
        <div className="avail-field avail-field-btn">
          <label className="avail-label" style={{ visibility: 'hidden' }}>Add</label>
          <button
            type="submit"
            disabled={isPending || endBeforeStart}
            className="avail-btn-add"
          >
            {isPending ? (
              <span className="avail-spinner" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            )}
            {isPending ? 'Salvando…' : 'Adicionar horário'}
          </button>
        </div>
      </div>

      {error && (
        <div className="avail-error-msg">{error}</div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .avail-form-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr auto;
          gap: 1rem;
          align-items: end;
        }
        .avail-field { display: flex; flex-direction: column; gap: 0.4rem; }
        .avail-field-btn { justify-content: flex-end; }
        .avail-label {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.07em;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          white-space: nowrap;
        }
        .avail-time-warn {
          font-size: 0.65rem;
          font-weight: 600;
          color: #D97706;
          text-transform: none;
          letter-spacing: 0;
        }
        .avail-input {
          width: 100%;
          padding: 0.65rem 0.85rem;
          font-size: 0.9rem;
          font-family: inherit;
          border-radius: 10px;
          border: 1.5px solid var(--border);
          background: var(--bg-card, #fff);
          color: var(--text-main);
          transition: border-color 0.15s, box-shadow 0.15s;
          outline: none;
          -webkit-appearance: none;
          appearance: none;
        }
        .avail-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(234,88,12,0.12);
        }
        .avail-input-error {
          border-color: #EF4444 !important;
          box-shadow: 0 0 0 3px rgba(239,68,68,0.1) !important;
        }
        .avail-btn-add {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.65rem 1.4rem;
          font-size: 0.88rem;
          font-weight: 700;
          font-family: inherit;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          white-space: nowrap;
          width: 100%;
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          color: #fff;
          box-shadow: 0 2px 8px rgba(234,88,12,0.28);
          transition: opacity 0.15s, box-shadow 0.15s, transform 0.1s;
        }
        .avail-btn-add:hover:not(:disabled) {
          box-shadow: 0 4px 14px rgba(234,88,12,0.38);
          transform: translateY(-1px);
        }
        .avail-btn-add:active:not(:disabled) { transform: translateY(0); }
        .avail-btn-add:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
        .avail-spinner {
          display: inline-block;
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: avail-spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        .avail-error-msg {
          margin-top: 0.85rem;
          padding: 0.65rem 1rem;
          border-radius: 8px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          color: #DC2626;
          font-size: 0.84rem;
          font-weight: 500;
        }
        @keyframes avail-spin { to { transform: rotate(360deg); } }
        @media (max-width: 700px) {
          .avail-form-grid {
            grid-template-columns: 1fr 1fr;
          }
          .avail-field-btn {
            grid-column: 1 / -1;
          }
          .avail-field-btn label { display: none; }
        }
        @media (max-width: 420px) {
          .avail-form-grid { grid-template-columns: 1fr; }
        }
      `}} />
    </form>
  )
}
