'use client'

/**
 * UpcomingClassesClient
 * Client Component que renderiza as próximas aulas do aluno.
 *
 * Regras de UX (não alterar sem aprovação de produto):
 *
 * Aula fixa (ID sintético rec-...):
 *   → Botão único "Remarcar aula" que leva para /dashboard/schedule com os params corretos.
 *     O fluxo de remarcar já cancela a instância e gera o crédito — é o fluxo original do sistema.
 *     Não existe botão separado de cancelar nesta tela.
 *
 * Aula de reposição (ID real UUID):
 *   → Sem botão de remarcar via sistema (fluxo não existe para este tipo nesta tela).
 *   → Botão "Falar com suporte" abre WhatsApp do suporte em nova aba.
 *   → Texto auxiliar: "Para cancelar ou remarcar uma reposição, fale com o suporte."
 *
 * Melhorias da Fase 4 (loading/refresh) preservadas:
 *   → Estado local da lista para reagir a eventuais mudanças de status via router.refresh().
 *   → Mensagens de erro inline (reservadas para erros futuros, não disparadas agora).
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import MeetLinkButton from '@/components/MeetLinkButton'
import type { Dictionary } from '@/i18n/dictionaries/pt'

// Número de suporte centralizado — mesmo valor de SupportContactCard.tsx
// Para alterar, mudar também em src/components/SupportContactCard.tsx
const SUPPORT_WHATSAPP = '5547997710603'
const SUPPORT_MESSAGE = encodeURIComponent(
  'Olá! Gostaria de ajuda para cancelar ou remarcar uma aula de reposição na EdAcademy.'
)

interface UpcomingClass {
  id: string
  start_time: string
  end_time: string
  status: string
  is_recurring: boolean
  teacher: {
    id: string
    full_name: string
    meet_url?: string | null
    whatsapp_number?: string | null
  } | null
}

interface Props {
  upcoming: UpcomingClass[]
  userTz: string
  isFallback: boolean
  t: Dictionary
}

export default function UpcomingClassesClient({ upcoming, userTz, isFallback, t }: Props) {
  const router = useRouter()

  // Estado local da lista — permite atualizar visualmente após router.refresh()
  const [items, setItems] = useState<UpcomingClass[]>(upcoming)

  // Mantemos setItems disponível para futuras ações que atualizem o estado local
  // (ex: quando router.refresh() trouxer novos dados via Server Component)
  void setItems
  void router

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {items.length > 0 ? items.map((apt) => {
        const start = new Date(apt.start_time)
        const end = new Date(apt.end_time)
        const now = new Date()
        const earlyEntry = new Date(start.getTime() - 10 * 60 * 1000)
        const canEnter = now >= earlyEntry && now <= end
        const isOngoing = now >= start && now <= end
        const isCancelled = apt.status === 'cancelled'
        const displayStart = new Date(start.getTime() + 10 * 60 * 1000)
        const teacher = apt.teacher

        // Aula fixa: ID sintético rec-...
        const isRecurring = apt.is_recurring || apt.id.startsWith('rec-')
        // Aula de reposição: ID real (UUID sem prefixo rec-)
        const isReplacement = !isRecurring

        const supportUrl = `https://wa.me/${SUPPORT_WHATSAPP}?text=${SUPPORT_MESSAGE}`

        return (
          <div key={apt.id}>
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderLeft: isCancelled
                  ? '4px solid #9CA3AF'
                  : `4px solid ${isRecurring ? 'var(--primary)' : '#F59E0B'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '1.1rem 1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1.25rem',
                opacity: isCancelled ? 0.55 : 1,
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                transition: 'box-shadow 0.2s, opacity 0.3s',
              }}
            >
              {/* Data + info */}
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <div style={{ textAlign: 'center', minWidth: '45px', borderRight: '1px solid var(--border)', paddingRight: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    {formatInTimeZone(start, userTz, 'MMM', { locale: ptBR })}
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: isCancelled ? 'var(--text-muted)' : 'var(--primary)' }}>
                    {formatInTimeZone(start, userTz, 'dd')}
                  </div>
                </div>
                <div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: isCancelled ? 'var(--error)' : (isRecurring ? 'var(--text-muted)' : '#CA8A04'),
                    marginBottom: '0.2rem',
                    fontWeight: (isCancelled || !isRecurring) ? 700 : 400,
                  }}>
                    {isCancelled
                      ? `● ${t.myClassesPage.cancelled}`
                      : (isRecurring ? t.myClassesPage.fixedClass : t.myClassesPage.replacementClass)}
                  </div>
                  <div style={{ fontWeight: 600, textDecoration: isCancelled ? 'line-through' : 'none' }}>
                    {formatInTimeZone(displayStart, userTz, 'HH:mm')} - {formatInTimeZone(end, userTz, 'HH:mm')}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                      {!isFallback ? t.myClassesPage.yourTimezone : t.myClassesPage.brTimezone}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    {t.myClassesPage.prof} {teacher?.full_name}
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {isCancelled ? (
                  <span style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                    padding: '0.5rem 1rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                  }}>
                    {t.myClassesPage.unavailable}
                  </span>
                ) : (
                  <>
                    {/* ── AULA FIXA ──────────────────────────────────────────────────
                        Um único botão "Remarcar aula" → /dashboard/schedule.
                        O fluxo de schedule já cuida de cancelar + gerar crédito + remarcar.
                        Não existe botão "Cancelar aula" separado nesta tela.
                    */}
                    {isRecurring && !isOngoing && (
                      <Link
                        href={`/dashboard/schedule?teacher_id=${teacher?.id}&reschedule_id=${apt.id}`}
                        className="btn-outline"
                        style={{
                          color: 'var(--error)',
                          borderColor: 'var(--error)',
                          padding: '0.5rem 1rem',
                          fontSize: '0.85rem',
                          textDecoration: 'none',
                        }}
                      >
                        {t.myClassesPage.reschedule}
                      </Link>
                    )}

                    {/* ── AULA DE REPOSIÇÃO / EXTRA ───────────────────────────────────
                        Sem fluxo de remarcar via sistema nesta tela.
                        Botão "Falar com suporte" abre WhatsApp em nova aba.
                    */}
                    {isReplacement && !isOngoing && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
                        <a
                          href={supportUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-outline"
                          style={{
                            padding: '0.5rem 1rem',
                            fontSize: '0.85rem',
                            textDecoration: 'none',
                            color: 'var(--text-muted)',
                            borderColor: 'var(--border)',
                            display: 'inline-block',
                          }}
                        >
                          Falar com suporte
                        </a>
                        <span style={{
                          fontSize: '0.7rem',
                          color: 'var(--text-muted)',
                          maxWidth: '200px',
                          textAlign: 'right',
                          lineHeight: 1.3,
                        }}>
                          Para cancelar ou remarcar uma reposição, fale com o suporte.
                        </span>
                      </div>
                    )}

                    {/* Botão entrar na aula — sempre disponível quando não cancelada */}
                    <MeetLinkButton
                      url={teacher?.meet_url}
                      label={isOngoing ? t.myClassesPage.enterClass : canEnter ? t.myClassesPage.roomOpen : t.myClassesPage.comingSoon}
                      emptyMessage={t.myClassesPage.noMeetLink}
                      canEnter={canEnter}
                      isOngoing={isOngoing}
                      className="btn-primary"
                      style={{ padding: '0.5rem 1.5rem', fontSize: '0.85rem' }}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        )
      }) : (
        <div style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-muted)', border: '1.5px dashed var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📅</div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.4rem', color: 'var(--text-main)' }}>
            {t.myClassesPage.noScheduledClassesTitle}
          </div>
          <p style={{ fontSize: '0.83rem' }}>{t.myClassesPage.noScheduledClassesDesc}</p>
        </div>
      )}
    </div>
  )
}
