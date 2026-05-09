'use client'

import { useState } from 'react'
import Link from 'next/link'
import DataTable from '@/components/DataTable'
import AlertBadge from '@/components/AlertBadge'

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

interface OperationalAlert {
  id: string
  type: string
  message: string
  created_at: string
  metadata?: any
}

interface FinanceiroClientProps {
  expiredStudents: Student[]
  operationalAlerts: OperationalAlert[]
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  active:   { label: 'Ativo',   cls: 'alert-badge-success' },
  inactive: { label: 'Inativo', cls: 'alert-badge-neutral' },
  pending:  { label: 'Pendente',cls: 'alert-badge-warning' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || STATUS_MAP.inactive
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

const TABS = [
  { id: 'vencidos',   label: 'Assinaturas vencidas' },
  { id: 'alertas',    label: 'Alertas operacionais' },
]

const ALERT_TYPE_MAP: Record<string, { label: string; type: 'warning'|'error'|'info' }> = {
  fixed_class_removed:  { label: 'Aula fixa removida',       type: 'warning' },
  availability_removed: { label: 'Expediente removido',      type: 'error'   },
  event_low_slots:      { label: 'Evento com poucas vagas',  type: 'info'    },
}

export default function FinanceiroClient({
  expiredStudents,
  operationalAlerts,
}: FinanceiroClientProps) {
  const [activeTab, setActiveTab] = useState('vencidos')

  const LANG_MAP: Record<string, string> = { english: 'Inglês', spanish: 'Espanhol' }

  const renderManageBtn = (id: string) => (
    <Link
      href={`/admin/profile?q=${encodeURIComponent(id)}`}
      className="btn-outline"
      style={{ fontSize: '0.75rem', padding: '0.35rem 0.85rem', whiteSpace: 'nowrap' }}
    >
      Gerenciar
    </Link>
  )

  const expiredCols = [
    { key: 'full_name', label: 'Aluno', render: (r: Student) => (
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{r.full_name}</div>
        {r.email && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.email}</div>}
      </div>
    )},
    { key: 'end_date', label: 'Vencimento', render: (r: Student) => <DateCell date={r.end_date} /> },
    { key: 'status',   label: 'Status',     render: (r: Student) => <StatusBadge status={r.status || 'inactive'} /> },
    { key: 'actions',  label: '',           render: (r: Student) => renderManageBtn(r.id) },
  ]


  const alertCols = [
    { key: 'type', label: 'Tipo', render: (r: OperationalAlert) => {
      const info = ALERT_TYPE_MAP[r.type] || { label: r.type, type: 'info' as const }
      return <AlertBadge type={info.type} message={info.label} />
    }},
    { key: 'message', label: 'Detalhe', render: (r: OperationalAlert) => (
      <span style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{r.message}</span>
    )},
    { key: 'created_at', label: 'Quando', render: (r: OperationalAlert) => (
      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        {new Date(r.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
      </span>
    )},
  ]

  const tabCounts: Record<string, number> = {
    vencidos:   expiredStudents.length,
    alertas:    operationalAlerts.length,
  }

  return (
    <div>
      {/* Tab Bar */}
      <div style={{
        display: 'flex', gap: '0.35rem', marginBottom: '1.5rem',
        background: '#FFFFFF', borderRadius: 'var(--radius-lg)',
        padding: '0.35rem', border: '1px solid rgba(229,231,235,0.7)',
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
      {activeTab === 'vencidos' && (
        <DataTable
          title="Alunos com assinatura vencida"
          columns={expiredCols}
          rows={expiredStudents}
          count={expiredStudents.length}
          emptyIcon=""
          emptyMessage="Nenhum registro encontrado"
          emptySubtext="Não há dados nesta categoria no momento."
          mobileCards
        />
      )}
      {activeTab === 'alertas' && (
        <DataTable
          title="Alertas operacionais recentes"
          columns={alertCols}
          rows={operationalAlerts}
          count={operationalAlerts.length}
          emptyIcon=""
          emptyMessage="Nenhum registro encontrado"
          emptySubtext="Não há dados nesta categoria no momento."
          mobileCards
        />
      )}
    </div>
  )
}
