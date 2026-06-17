'use client'

/**
 * AvailabilitySlotsClient
 * Wrapper client que mantém a lista de blocos de expediente em estado local.
 *
 * Quando RemoveAvailabilityButton remove um bloco com sucesso,
 * ele chama onRemoved(id) que remove o item localmente sem esperar o reload total.
 * O revalidatePath no servidor já cuida da sincronização via Next.js.
 *
 * Duplo-clique: prevenido pelo isPending interno de RemoveAvailabilityButton (useTransition).
 */

import { useState } from 'react'
import { RemoveAvailabilityButton } from './RemoveAvailabilityButton'

interface SlotItem {
  id: string
  localDay: number
  localStart: string
  localEnd: string
}

interface Props {
  slots: SlotItem[]
  totalCount: number
}

// Ícone de relógio (mesmo do page.tsx, evita dependência de Server Component)
function IconClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}

const DIAS = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
]

export default function AvailabilitySlotsClient({ slots: initialSlots, totalCount: initialCount }: Props) {
  const [slots, setSlots] = useState<SlotItem[]>(initialSlots)

  function handleRemoved(id: string) {
    setSlots(prev => prev.filter(s => s.id !== id))
  }

  // Agrupar por dia
  const byDay = new Map<number, SlotItem[]>()
  for (const s of slots) {
    if (!byDay.has(s.localDay)) byDay.set(s.localDay, [])
    byDay.get(s.localDay)!.push(s)
  }

  if (slots.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '3rem 2rem', textAlign: 'center',
        background: 'var(--bg-card, #fff)',
        border: '1.5px dashed var(--border)',
        borderRadius: 14,
      }}>
        <span style={{ fontSize: '2.25rem', marginBottom: '0.75rem', lineHeight: 1 }}>🗓</span>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.4rem' }}>Nenhum horário cadastrado</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', maxWidth: 340 }}>
          Adicione seu primeiro bloco de expediente usando o formulário acima.
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {Array.from(byDay.entries()).map(([dayNum, daySlots]) => (
        <div key={dayNum} style={{
          background: 'var(--bg-card, #fff)',
          border: '1.5px solid var(--border)',
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
          transition: 'box-shadow 0.15s',
        }}
        className="sched-day-card"
        >
          {/* Cabeçalho do dia */}
          <div style={{
            padding: '0.75rem 1.25rem',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-main)',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, display: 'inline-block' }} />
            <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{DIAS[dayNum]}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {daySlots.length} {daySlots.length === 1 ? 'bloco' : 'blocos'}
            </span>
          </div>

          {/* Slots do dia */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {daySlots.map((av, idx) => (
              <div key={av.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.85rem 1.25rem',
                borderBottom: idx < daySlots.length - 1 ? '1px dashed var(--border)' : 'none',
                gap: '1rem',
              }}>
                {/* Horário */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <IconClock />
                  <span style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>
                    {av.localStart}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>→</span>
                  <span style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>
                    {av.localEnd}
                  </span>
                  {idx > 0 && (
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem',
                      borderRadius: 99, background: 'rgba(234,88,12,0.08)',
                      color: 'var(--primary)', border: '1px solid rgba(234,88,12,0.15)',
                      letterSpacing: '0.04em', textTransform: 'uppercase',
                    }}>
                      Bloco extra
                    </span>
                  )}
                </div>

                {/* Remover — com callback onRemoved para remoção local */}
                <RemoveAvailabilityButton
                  availabilityId={av.id}
                  displayTime={`${av.localStart} → ${av.localEnd}`}
                  onRemoved={handleRemoved}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
