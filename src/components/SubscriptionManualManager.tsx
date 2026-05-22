'use client'

import { useState } from 'react'
import { updateSubscriptionManual } from '@/app/admin/actions'
import ConfirmModal from '@/components/ConfirmModal'

interface SubscriptionManualManagerProps {
  studentId: string
  currentStatus: string
  currentEndDate: string | null
  currentNotes: string | null
  studentName: string
}

/** Formata uma string YYYY-MM-DD para dd/mm/aaaa */
function formatDisplay(value: string): string {
  if (!value) return ''
  const [y, m, d] = value.split('-')
  if (!y || !m || !d) return value
  return `${d}/${m}/${y}`
}

/** Converte Date para YYYY-MM-DD sem offset de timezone */
function toLocalISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function SubscriptionManualManager({
  studentId,
  currentStatus,
  currentEndDate,
  currentNotes,
  studentName,
}: SubscriptionManualManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState<'active' | 'inactive'>(currentStatus as any || 'inactive')

  // endDate é sempre YYYY-MM-DD internamente
  const [endDate, setEndDate] = useState('')
  const [dateInput, setDateInput] = useState('')
  const [dateError, setDateError] = useState('')

  const [notes, setNotes] = useState(currentNotes || '')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  
  const [showConfirm, setShowConfirm] = useState(false)
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false)

  const freshDateStr = currentEndDate ? toLocalISODate(new Date(currentEndDate)) : ''
  const hasUnsavedChanges = status !== (currentStatus || 'inactive') ||
                            endDate !== freshDateStr ||
                            notes !== (currentNotes || '')

  /** Abre o modal resetando o estado para os valores atuais dos props */
  function openModal() {
    setStatus(currentStatus as any || 'inactive')
    setEndDate(freshDateStr)
    setDateInput(formatDisplay(freshDateStr))
    setDateError('')
    setNotes(currentNotes || '')
    setErrorMsg(null)
    setSuccessMsg(null)
    setShowConfirm(false)
    setShowUnsavedConfirm(false)
    setIsOpen(true)
  }

  function handleCancel() {
    if (hasUnsavedChanges) {
      setShowUnsavedConfirm(true)
    } else {
      setIsOpen(false)
    }
  }

  /** Valida e sincroniza o campo de texto dd/mm/aaaa → YYYY-MM-DD */
  function handleDateInputBlur() {
    const raw = dateInput.trim()
    if (!raw) {
      setEndDate('')
      setDateError('')
      return
    }
    // Aceita dd/mm/aaaa ou dd-mm-aaaa
    const parts = raw.split(/[\/\-]/)
    if (parts.length === 3) {
      const [d, m, y] = parts
      const isoStr = `${y.padStart(4, '20')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
      const parsed = new Date(isoStr + 'T12:00:00')
      if (!isNaN(parsed.getTime())) {
        setEndDate(isoStr)
        setDateInput(formatDisplay(isoStr))
        setDateError('')
        return
      }
    }
    setDateError('Data inválida. Use o formato dd/mm/aaaa.')
  }

  function setToday() {
    const iso = toLocalISODate(new Date())
    setEndDate(iso)
    setDateInput(formatDisplay(iso))
    setDateError('')
  }

  async function handleUpdate() {
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      await updateSubscriptionManual(studentId, status, endDate || null, notes)
      setShowConfirm(false)
      setSuccessMsg('Ajuste aplicado com sucesso!')
      setTimeout(() => {
        setIsOpen(false)
        setSuccessMsg(null)
      }, 1500)
    } catch (err) {
      setErrorMsg('Erro: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={openModal}
        className="btn-outline"
        style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', marginLeft: '0.5rem', borderColor: 'var(--primary)', color: 'var(--primary)' }}
      >
        Ajuste Manual
      </button>
    )
  }

  return (
    <>
      {/* Modal principal */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        backdropFilter: 'blur(5px)', padding: '1rem',
      }}>
        <div
          className="card animate-fade-in"
          style={{ width: '100%', maxWidth: '460px', padding: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', position: 'relative' }}
        >
          {/* Fechar */}
          <button
            onClick={handleCancel}
            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', color: 'var(--text-muted)', lineHeight: 1, padding: '0.2rem 0.4rem', borderRadius: 'var(--radius-sm)' }}
            aria-label="Fechar"
          >
            &times;
          </button>

          {/* Cabeçalho */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Gestão de Assinatura</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
              Aluno: <strong style={{ color: 'var(--text-main)' }}>{studentName}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>

            {/* Status */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Status de Acesso
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(['active', 'inactive'] as const).map((s) => {
                  const isSelected = status === s
                  const isAct = s === 'active'
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      style={{
                        flex: 1, padding: '0.65rem 0.75rem', borderRadius: 'var(--radius-md)',
                        border: `1px solid ${isSelected ? (isAct ? 'var(--success)' : 'var(--error)') : 'var(--border)'}`,
                        background: isSelected
                          ? (isAct ? 'var(--success-bg, rgba(16,185,129,0.12))' : 'var(--error-bg, rgba(239,68,68,0.12))')
                          : 'var(--bg-main)',
                        color: isSelected
                          ? (isAct ? 'var(--success)' : 'var(--error)')
                          : 'var(--text-muted)',
                        fontWeight: isSelected ? 700 : 500,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {s === 'active' ? 'Ativo — Acesso Liberado' : 'Inativo — Bloqueado'}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Data de Vencimento */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Data de Vencimento
              </label>

              {/* Grid: input | botão Hoje — colapsa para coluna no mobile */}
              <div className="smm-date-row">
                <input
                  type="text"
                  inputMode="numeric"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary)' }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = dateError ? 'var(--error)' : 'var(--border)'
                    handleDateInputBlur()
                  }}
                  placeholder="dd/mm/aaaa"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    fontFamily: 'inherit',
                    color: 'var(--text-main)',
                    background: 'var(--bg-main)',
                    border: `1.5px solid ${dateError ? 'var(--error)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                    boxSizing: 'border-box',
                    minWidth: 0,
                  }}
                />

                <button
                  type="button"
                  onClick={setToday}
                  style={{
                    padding: '0.75rem 1.1rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, color 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)'
                    e.currentTarget.style.color = 'var(--primary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.color = 'var(--text-muted)'
                  }}
                >
                  Hoje
                </button>
              </div>

              {dateError && (
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--error)' }}>{dateError}</p>
              )}

              {/* Data atual no sistema */}
              {currentEndDate && (
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0.1rem 0 0' }}>
                  Data atual: <strong>{new Date(currentEndDate).toLocaleDateString('pt-BR')}</strong>
                </p>
              )}
            </div>

            {/* CSS responsivo da linha de data — injetado uma única vez */}
            <style>{`
              .smm-date-row {
                display: grid;
                grid-template-columns: 1fr auto;
                gap: 0.65rem;
                align-items: center;
              }
              @media (max-width: 400px) {
                .smm-date-row {
                  grid-template-columns: 1fr;
                }
                .smm-date-row button {
                  width: 100%;
                }
              }
            `}</style>


            {/* Observações */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Observações <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Prorrogação acordada via chat..."
                rows={3}
                style={{
                  width: '100%', padding: '0.75rem', resize: 'none',
                  fontSize: '0.875rem', borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--border)',
                  background: 'var(--bg-main)', color: 'var(--text-main)',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Erro */}
            {errorMsg && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid var(--error)',
                borderRadius: 'var(--radius-md)', padding: '0.65rem 0.85rem',
                fontSize: '0.82rem', color: 'var(--error)', fontWeight: 500,
              }}>
                {errorMsg}
              </div>
            )}

            {/* Sucesso */}
            {successMsg && (
              <div style={{
                background: 'rgba(16,185,129,0.1)', border: '1px solid var(--success)',
                borderRadius: 'var(--radius-md)', padding: '0.65rem 0.85rem',
                fontSize: '0.82rem', color: 'var(--success)', fontWeight: 600,
                textAlign: 'center'
              }}>
                {successMsg}
              </div>
            )}

            {/* Ações */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
              <button
                className="btn-primary"
                onClick={() => { setErrorMsg(null); setShowConfirm(true) }}
                disabled={loading || !!dateError || !!successMsg}
                style={{ flex: 1, height: '45px', justifyContent: 'center' }}
              >
                {loading ? 'Processando...' : 'Aplicar Ajustes'}
              </button>
              <button
                className="btn-outline"
                onClick={handleCancel}
                disabled={loading || !!successMsg}
                style={{ flex: 1, height: '45px', justifyContent: 'center' }}
              >
                Cancelar
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Modal de confirmação antes de salvar */}
      <ConfirmModal
        isOpen={showConfirm}
        title="Confirmar ajuste manual"
        message={`Aplicar alterações na assinatura de ${studentName}? Esta ação atualizará o status e a data de vencimento.`}
        cancelLabel="Voltar"
        confirmLabel="Aplicar Ajustes"
        confirmVariant="primary"
        onCancel={() => setShowConfirm(false)}
        onConfirm={handleUpdate}
        errorMessage={errorMsg}
        isLoading={loading}
      />

      {/* Modal de aviso: alterações não salvas */}
      <ConfirmModal
        isOpen={showUnsavedConfirm}
        title="Alterações não salvas"
        message="Existem alterações não salvas. Deseja sair sem salvar?"
        cancelLabel="Continuar editando"
        confirmLabel="Sair sem salvar"
        confirmVariant="danger"
        onCancel={() => setShowUnsavedConfirm(false)}
        onConfirm={() => {
          setShowUnsavedConfirm(false)
          setIsOpen(false)
        }}
      />
    </>
  )
}
