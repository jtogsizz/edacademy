'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import DataTable from '@/components/DataTable'
import AlertBadge from '@/components/AlertBadge'
import ConfirmModal from '@/components/ConfirmModal'
import { useTranslation } from '@/i18n'

interface Student {
  id: string
  full_name: string
  email?: string | null
  end_date?: string | null
  status?: string
  replacement_credits?: number
  plan_type?: string | null
  student_language?: string | null
}

interface FinanceiroClientProps {
  pending: Student[]
  active: Student[]
  overdue: Student[]
  transactions?: { amount: number; reference_month: number }[]
}

// Configuração de um modal ativo
interface ActiveModal {
  type: 'confirmPayment' | 'rejectPayment' | 'renewSubscription' | 'cancelPlan'
  studentId: string
}

function StatusBadge({ status, statusMap }: { status: string; statusMap: Record<string, { label: string; cls: string }> }) {
  const s = statusMap[status] || statusMap.inactive
  return <span className={`alert-badge ${s.cls}`}>{s.label}</span>
}

function DateCell({ date }: { date?: string | null }) {
  if (!date) return <span style={{ color: 'var(--text-muted)' }}>—</span>
  const d = new Date(date)
  const now = new Date()
  const diff = Math.ceil((d.getTime() - now.getTime()) / 86400000)
  const overdue = diff < 0
  return (
    <span style={{ color: overdue ? 'var(--error)' : diff <= 3 ? '#D97706' : 'var(--text-main)', fontWeight: overdue ? 700 : 400 }}>
      {d.toLocaleDateString('pt-BR')}
      {overdue && <span style={{ fontSize: '0.7rem', marginLeft: '0.3rem', color: 'var(--error)' }}>({Math.abs(diff)}d atrás)</span>}
      {!overdue && diff <= 7 && <span style={{ fontSize: '0.7rem', marginLeft: '0.3rem', color: '#D97706' }}>({diff}d)</span>}
    </span>
  )
}

export default function FinanceiroClient({
  pending,
  active,
  overdue,
  transactions = [],
}: FinanceiroClientProps) {
  const [activeTab, setActiveTab] = useState('pendentes')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [activeModal, setActiveModal] = useState<ActiveModal | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Estados locais para UI Otimista pós-ação
  const [localPending, setLocalPending] = useState(pending)
  const [localActive, setLocalActive] = useState(active)
  const [localOverdue, setLocalOverdue] = useState(overdue)

  // Sincroniza se as props mudarem (ex: após o revalidatePath atualizar a tela)
  useEffect(() => {
    setLocalPending(pending)
    setLocalActive(active)
    setLocalOverdue(overdue)
  }, [pending, active, overdue])

  function showToast(text: string, type: 'success' | 'error' = 'success') {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  const t = useTranslation()
  const tf = t.financial

  const LANG_MAP: Record<string, string> = { english: 'Inglês', spanish: 'Espanhol' }

  const STATUS_MAP: Record<string, { label: string; cls: string }> = {
    active:   { label: tf.statusActive,   cls: 'alert-badge-success' },
    inactive: { label: tf.statusInactive, cls: 'alert-badge-neutral' },
    pending:  { label: tf.statusPending,  cls: 'alert-badge-warning' },
  }

  const TABS = [
    { id: 'pendentes', label: tf.tabPending },
    { id: 'ativos',    label: tf.tabActive },
    { id: 'vencidas',  label: tf.tabOverdue },
  ]

  // ── Abre modal e limpa erros anteriores ──────────────────────
  function openModal(type: ActiveModal['type'], studentId: string) {
    setModalError(null)
    setMenuOpenId(null)
    setActiveModal({ type, studentId })
  }

  function closeModal() {
    if (modalLoading) return // impede fechar durante operação
    setActiveModal(null)
    setModalError(null)
  }

  // ── Executa a server action após confirmação no modal ─────────
  async function handleModalConfirm() {
    if (!activeModal) return
    setModalLoading(true)
    setModalError(null)

    try {
      const { type, studentId } = activeModal

      if (type === 'confirmPayment') {
        const { confirmPayment } = await import('./actions')
        const res = await confirmPayment(studentId)

        // Verificar erro de duplicidade ou qualquer retorno de falha
        if (res && !res.success) {
          setModalError(res.error ?? 'Ocorreu um erro. Tente novamente.')
          return
        }

        // Optimistic UI pós-sucesso
        const st = localPending.find(s => s.id === studentId)
        if (st) {
          setLocalPending(p => p.filter(s => s.id !== studentId))
          setLocalActive(p => [{ ...st, status: 'active' }, ...p])
        }
        showToast('Pagamento aprovado!')

      } else if (type === 'rejectPayment') {
        const { rejectPayment } = await import('./actions')
        await rejectPayment(studentId)

        // Optimistic UI pós-sucesso
        const st = localPending.find(s => s.id === studentId)
        if (st) {
          setLocalPending(p => p.filter(s => s.id !== studentId))
          setLocalOverdue(p => [{ ...st, status: 'inactive' }, ...p])
        }
        showToast('Pagamento rejeitado.')

      } else if (type === 'renewSubscription') {
        const { renewSubscription } = await import('./actions')
        const res = await renewSubscription(studentId)

        // Verificar erro de duplicidade ou qualquer retorno de falha
        if (res && !res.success) {
          setModalError(res.error ?? 'Ocorreu um erro. Tente novamente.')
          return
        }

        // Optimistic UI pós-sucesso
        setLocalActive(p => p.map(s => {
          if (s.id === studentId) {
             const d = new Date(s.end_date || new Date())
             d.setMonth(d.getMonth() + 1)
             return { ...s, end_date: d.toISOString() }
          }
          return s
        }))
        showToast('Assinatura renovada!')

      } else if (type === 'cancelPlan') {
        const { cancelPlan } = await import('./actions')
        await cancelPlan(studentId)

        // Optimistic UI pós-sucesso
        const st = localActive.find(s => s.id === studentId)
        if (st) {
          setLocalActive(p => p.filter(s => s.id !== studentId))
          setLocalOverdue(p => [{ ...st, status: 'inactive' }, ...p])
        }
        showToast('Plano cancelado com sucesso.')
      }

      // Sucesso: fecha o modal
      setActiveModal(null)
      setModalError(null)
    } catch (err: any) {
      // Exibe o erro dentro do próprio modal (sem alert nativo)
      setModalError(err?.message ?? 'Ocorreu um erro. Tente novamente.')
    } finally {
      setModalLoading(false)
    }
  }

  // ── Configuração de cada tipo de modal ────────────────────────
  function getModalProps() {
    if (!activeModal) return null
    const { type } = activeModal

    if (type === 'confirmPayment') {
      return {
        title: tf.modalConfirmPaymentTitle,
        message: tf.modalConfirmPaymentMsg,
        confirmLabel: tf.modalConfirmPaymentBtn,
        confirmVariant: 'primary' as const,
      }
    }
    if (type === 'rejectPayment') {
      return {
        title: tf.modalRejectTitle,
        message: tf.modalRejectMsg,
        confirmLabel: tf.modalRejectBtn,
        confirmVariant: 'danger' as const,
      }
    }
    if (type === 'renewSubscription') {
      return {
        title: tf.modalRenewTitle,
        message: tf.modalRenewMsg,
        confirmLabel: tf.modalRenewBtn,
        confirmVariant: 'primary' as const,
      }
    }
    if (type === 'cancelPlan') {
      return {
        title: tf.modalCancelPlanTitle,
        message: tf.modalCancelPlanMsg,
        confirmLabel: tf.modalCancelPlanBtn,
        confirmVariant: 'danger' as const,
      }
    }
    return null
  }

  // ── Renderização dos botões por linha da tabela ───────────────
  const renderActiveOverdueActions = (id: string) => {
    if (loadingId === id) return <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{tf.processing}</span>
    const isOpen = menuOpenId === id
    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button
          onClick={() => setMenuOpenId(isOpen ? null : id)}
          className="btn-outline"
          style={{ fontSize: '0.75rem', padding: '0.35rem 0.85rem', whiteSpace: 'nowrap' }}
        >
          {tf.manage}
        </button>
        {isOpen && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)'
          }}>
            <div
              style={{ position: 'absolute', inset: 0 }}
              onClick={() => setMenuOpenId(null)}
            />
            <div style={{
              position: 'relative', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
              boxShadow: '0 10px 25px rgba(0,0,0,0.25)', zIndex: 10000, width: '90%', maxWidth: '320px',
              display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1.25rem',
              border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-main)' }}>
                {tf.subscriptionActions}
              </div>
              <button
                onClick={() => openModal('renewSubscription', id)}
                className="btn-primary"
                style={{ padding: '0.75rem 1rem', marginBottom: '0.75rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600, width: '100%', border: 'none', borderRadius: 'var(--radius-md)' }}
              >
                {tf.renew}
              </button>
              <button
                onClick={() => openModal('cancelPlan', id)}
                className="btn-outline"
                style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600, width: '100%', borderColor: 'var(--error)', color: 'var(--error)' }}
              >
                {tf.cancelPlan}
              </button>
              <button
                onClick={() => setMenuOpenId(null)}
                style={{ background: 'transparent', border: 'none', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 }}
              >
                {t.payment.close}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderManageBtn = (id: string, student?: Student) => {
    // Preferência: email > nome > UUID (UUID como último recurso para robustez)
    const searchQuery = student?.email || student?.full_name || id
    return (
      <Link
        href={`/admin/profile?q=${encodeURIComponent(searchQuery)}`}
        className="btn-outline"
        style={{ fontSize: '0.75rem', padding: '0.35rem 0.85rem', whiteSpace: 'nowrap' }}
      >
        {tf.viewProfile}
      </Link>
    )
  }

  const renderPendingActions = (id: string, student?: Student) => {
    if (loadingId === id) return <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{tf.processing}</span>
    return (
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={() => openModal('confirmPayment', id)}
          style={{ background: 'var(--success)', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.35rem 0.75rem', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
        >
          {tf.confirm}
        </button>
        <button
          onClick={() => openModal('rejectPayment', id)}
          style={{ background: 'var(--error)', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.35rem 0.75rem', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
        >
          {tf.reject}
        </button>
        {renderManageBtn(id, student)}
      </div>
    )
  }

  const getCols = (isPending: boolean) => [
    { key: 'full_name', label: tf.student, render: (r: Student) => (
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{r.full_name}</div>
        {r.email && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.email}</div>}
      </div>
    )},
    { key: 'end_date', label: tf.expiry,  render: (r: Student) => <DateCell date={r.end_date} /> },
    { key: 'status',   label: tf.status,  render: (r: Student) => <StatusBadge status={r.status || 'inactive'} statusMap={STATUS_MAP} /> },
    { key: 'actions',  label: tf.actions, render: (r: Student) => isPending ? renderPendingActions(r.id, r) : renderActiveOverdueActions(r.id) },
  ]

  const tabCounts: Record<string, number> = {
    pendentes: localPending.length,
    ativos:    localActive.length,
    vencidas:  localOverdue.length,
  }

  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const monthTx = transactions.filter(tx => tx.reference_month === i + 1)
    const amount = monthTx.reduce((acc, tx) => acc + Number(tx.amount || 0), 0)
    return { month: i + 1, amount, count: monthTx.length }
  })

  const totalYearAmount = transactions.reduce((acc, tx) => acc + Number(tx.amount || 0), 0)
  const totalYearCount = transactions.length
  const maxMonthAmount = Math.max(...monthlyData.map(d => d.amount), 1)

  const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val)
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

  const modalProps = getModalProps()

  return (
    <div>
      {/* ── Toast Simples ── */}
      {toastMessage && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 100000,
          background: toastMessage.type === 'success' ? 'var(--success)' : 'var(--error)',
          color: '#fff', padding: '1rem 1.5rem', borderRadius: 'var(--radius-md)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)', fontWeight: 600, fontSize: '0.9rem',
          animation: 'fade-in-up 0.3s ease-out forwards'
        }}>
          {toastMessage.text}
        </div>
      )}

      {/* ── Modal de Confirmação ── */}
      {modalProps && (
        <ConfirmModal
          isOpen={!!activeModal}
          title={modalProps.title}
          message={modalProps.message}
          cancelLabel={tf.modalCancel}
          confirmLabel={modalProps.confirmLabel}
          confirmVariant={modalProps.confirmVariant}
          onCancel={closeModal}
          onConfirm={handleModalConfirm}
          errorMessage={modalError}
          isLoading={modalLoading}
        />
      )}

      {/* ── Resumo Anual ── */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Faturamento Anual</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>{formatBRL(totalYearAmount)}</div>
          </div>
          <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '1.5rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Pagamentos Confirmados</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>{totalYearCount}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '150px', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {monthlyData.map((data, index) => {
            const heightPercent = (data.amount / maxMonthAmount) * 100
            return (
              <div key={index} className="group" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }} title={`${monthNames[index]}: ${formatBRL(data.amount)} (${data.count})`}>
                <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <div style={{
                    width: '100%', maxWidth: '40px',
                    height: `${heightPercent}%`,
                    minHeight: data.amount > 0 ? '4px' : '0px',
                    background: data.amount > 0 ? 'var(--primary-gradient)' : 'var(--bg-hover)',
                    borderRadius: '4px 4px 0 0',
                    transition: 'all 0.3s ease',
                    opacity: data.amount > 0 ? 0.9 : 0.3
                  }} className="chart-bar" />
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  {monthNames[index]}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{
        display: 'flex', gap: '0.35rem', marginBottom: '1.5rem',
        background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
        padding: '0.35rem', border: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        overflowX: 'auto',
      }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          const count = tabCounts[tab.id]
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: '1 0 auto',
                padding: '0.55rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#FFFFFF' : 'var(--text-muted)',
                background: isActive ? 'var(--primary-gradient)' : 'transparent',
                boxShadow: isActive ? '0 2px 8px rgba(234,88,12,0.25)' : 'none',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: '0.4rem',
              }}
            >
              {tab.label}
              {count > 0 && (
                <span style={{
                  fontSize: '0.68rem', fontWeight: 700, lineHeight: 1,
                  padding: '0.15rem 0.4rem', borderRadius: '99px',
                  background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--primary-light)',
                  color: isActive ? '#fff' : 'var(--primary)',
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'pendentes' && (
        <DataTable
          title={tf.pendingTable}
          columns={getCols(true)}
          rows={localPending}
          count={localPending.length}
          emptyIcon=""
          emptyMessage={tf.emptyClean}
          emptySubtext={tf.emptyNoPending}
          mobileCards
        />
      )}
      {activeTab === 'ativos' && (
        <DataTable
          title={tf.activeTable}
          columns={getCols(false)}
          rows={localActive}
          count={localActive.length}
          emptyIcon=""
          emptyMessage={tf.emptyNoData}
          emptySubtext={tf.emptyNoCategory}
          mobileCards
        />
      )}
      {activeTab === 'vencidas' && (
        <DataTable
          title={tf.overdueTable}
          columns={getCols(false)}
          rows={localOverdue}
          count={localOverdue.length}
          emptyIcon=""
          emptyMessage={tf.emptyNoData}
          emptySubtext={tf.emptyNoCategory}
          mobileCards
        />
      )}
    </div>
  )
}
