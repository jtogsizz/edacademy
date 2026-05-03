'use client'

import { useState } from 'react'

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

export default function PixPaymentModal({ pix }: { pix: PixData }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!pix.pix_key) return null

  const handleCopy = () => {
    navigator.clipboard.writeText(pix.pix_key!)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const keyTypeLabel = pix.pix_key_type
    ? (KEY_TYPE_LABELS[pix.pix_key_type] ?? pix.pix_key_type)
    : 'Chave PIX'

  return (
    <>
      {/* Trigger button */}
      <button
        id="pix-payment-btn"
        onClick={() => setOpen(true)}
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
        Pagar Mensalidade (PIX)
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
            position: 'relative',
            animation: 'fadeInUp 0.25s ease',
          }}>
            {/* Close */}
            <button
              onClick={() => setOpen(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}
              aria-label="Fechar"
            >
              ×
            </button>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '0.25rem' }}>Pagar com PIX</h3>
              {pix.pix_beneficiary_name && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Beneficiário: <strong>{pix.pix_beneficiary_name}</strong></p>
              )}
            </div>

            {/* QR Code */}
            {pix.pix_qr_code_url && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid var(--border)' }}>
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
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>ou copie a chave</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
              </div>
            )}

            {/* Key type label */}
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {keyTypeLabel}
            </div>

            {/* Key + copy button */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <input
                readOnly
                value={pix.pix_key}
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
                }}
                onFocus={e => e.target.select()}
              />
              <button
                onClick={handleCopy}
                style={{
                  padding: '0.65rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  backgroundColor: copied ? 'var(--success)' : 'var(--bg-main)',
                  color: copied ? '#fff' : 'var(--text-main)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {copied ? '✓ Copiado!' : '📋 Copiar'}
              </button>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
              Após o pagamento, entre em contato com o suporte para confirmar a renovação do seu plano.
            </p>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </>
  )
}
