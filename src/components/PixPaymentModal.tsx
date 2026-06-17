'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { markPaymentPending } from '@/app/dashboard/actions'
import { useTranslation } from '@/i18n'

type PixData = {
  pix_key: string | null
  pix_key_type: string | null
  pix_beneficiary_name: string | null
  pix_qr_code_url: string | null
}

const KEY_TYPE_LABELS: Record<string, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'E-mail',
  phone: 'Telefone',
  random: 'Chave Aleatória',
}

export default function PixPaymentModal({
  pix,
  subscriptionStatus,
  isRenewal,
}: {
  pix: PixData
  subscriptionStatus?: string | null
  isRenewal?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const router = useRouter()
  const t = useTranslation()

  if (!pix.pix_key) return null

  // Se pagamento já foi sinalizado, mostrar apenas o banner de status
  if (subscriptionStatus === 'pending_confirmation') {
    return (
      <div
        style={{
          padding: '0.85rem 1rem',
          backgroundColor: 'rgba(234,179,8,0.07)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(234,179,8,0.35)',
          marginTop: '1rem',
        }}
      >
        <p style={{ color: '#CA8A04', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center', margin: 0 }}>
          {t.payment.inReview}
        </p>
      </div>
    )
  }

  // Botão de confirmar aparece para qualquer status que NÃO seja 'active' nem 'pending_confirmation'
  // OU se for uma renovação (isRenewal === true)
  const canConfirmPayment = (subscriptionStatus !== 'active' && subscriptionStatus !== 'pending_confirmation') || isRenewal

  const handleCopy = () => {
    navigator.clipboard.writeText(pix.pix_key!)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleConfirmPayment = () => {
    setErrorMessage(null)
    startTransition(async () => {
      const res = await markPaymentPending()
      if (res.success) {
        setOpen(false)
        router.refresh()
      } else {
        setErrorMessage(t.payment.errorMessage)
      }
    })
  }

  const keyTypeLabel = pix.pix_key_type
    ? (KEY_TYPE_LABELS[pix.pix_key_type] ?? pix.pix_key_type)
    : 'Chave PIX'

  return (
    <>
      {/* ── Botão que abre o modal ── */}
      <button
        id="pix-payment-btn"
        onClick={() => {
          setErrorMessage(null)
          setOpen(true)
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.8rem 1.75rem',
          backgroundColor: '#25D366',
          color: '#fff',
          fontWeight: 700,
          fontSize: '0.95rem',
          border: 'none',
          borderRadius: '9999px',
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(37,211,102,0.35)',
          transition: 'all 0.2s ease',
          width: '100%',
          justifyContent: 'center',
        }}
      >
        {t.payment.openModal}
      </button>

      {/* ── Modal overlay ── */}
      {open && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.60)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          {/* ── Caixa do modal ── */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
              position: 'relative',
              animation: 'fadeInUp 0.25s ease',
            }}
          >
            {/* X canto */}
            <button
              onClick={() => setOpen(false)}
              aria-label="Fechar"
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                fontSize: '1.4rem',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                lineHeight: 1,
                padding: '0.25rem',
              }}
            >
              ×
            </button>

            {/* Título */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '0.25rem' }}>{t.payment.modalTitle}</h3>
              {pix.pix_beneficiary_name && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                  {t.payment.beneficiary}: <strong>{pix.pix_beneficiary_name}</strong>
                </p>
              )}
            </div>

            {/* QR Code */}
            {pix.pix_qr_code_url && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <div
                  style={{
                    padding: '0.75rem',
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <img
                    src={pix.pix_qr_code_url}
                    alt="QR Code PIX"
                    style={{ width: '180px', height: '180px', objectFit: 'contain', display: 'block' }}
                  />
                </div>
              </div>
            )}

            {/* Divider */}
            {pix.pix_qr_code_url && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {t.payment.orCopyKey}
                </span>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
              </div>
            )}

            {/* Label tipo de chave */}
            <div
              style={{
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                fontWeight: 700,
                marginBottom: '0.4rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {keyTypeLabel}
            </div>

            {/* Chave + botão copiar */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <input
                readOnly
                value={pix.pix_key!}
                onFocus={(e) => e.target.select()}
                style={{
                  flex: 1,
                  padding: '0.65rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-main)',
                  color: 'var(--text-main)',
                  fontSize: '0.92rem',
                  fontFamily: 'monospace',
                  cursor: 'text',
                  minWidth: 0,
                }}
              />
              <button
                onClick={handleCopy}
                style={{
                  padding: '0.65rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  backgroundColor: copied ? '#059669' : 'var(--bg-main)',
                  color: copied ? '#fff' : 'var(--text-main)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {copied ? t.payment.copied : t.payment.copyKey}
              </button>
            </div>

            {/* Separador antes dos botões */}
            <div style={{ height: '1px', backgroundColor: 'var(--border)', marginBottom: '1.25rem' }} />

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              {isRenewal
                ? t.payment.renewalHint
                : t.payment.afterPaymentHint}
            </p>

            {/* ── Área de ação ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>

              {errorMessage && (
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--error)',
                  fontSize: '0.8rem',
                  textAlign: 'center',
                  fontWeight: 600
                }}>
                  {errorMessage}
                </div>
              )}

              {/* Botão principal: Já realizei o pagamento */}
              {canConfirmPayment && (
                <button
                  id="pix-confirm-payment-btn"
                  onClick={handleConfirmPayment}
                  disabled={isPending}
                  style={{
                    width: '100%',
                    padding: '0.9rem 1rem',
                    backgroundColor: '#EA580C',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    opacity: isPending ? 0.65 : 1,
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 14px rgba(234,88,12,0.35)',
                    letterSpacing: '0.01em',
                  }}
                >
                  {isPending ? t.payment.sending : t.payment.confirmPayment}
                </button>
              )}

              {/* Botão secundário: Fechar */}
              <button
                id="pix-close-modal-btn"
                onClick={() => setOpen(false)}
                disabled={isPending}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--bg-main)',
                  color: 'var(--text-main)',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                  opacity: isPending ? 0.5 : 1,
                }}
              >
                {t.payment.close}
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        #pix-confirm-payment-btn:hover:not(:disabled) {
          background-color: #C2410C !important;
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(234,88,12,0.45) !important;
        }
        #pix-close-modal-btn:hover:not(:disabled) {
          background-color: var(--bg-card) !important;
        }
      `}} />
    </>
  )
}
