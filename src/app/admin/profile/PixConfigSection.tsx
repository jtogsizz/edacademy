'use client'

import { useState, useTransition } from 'react'

type PixConfig = {
  pix_key: string | null
  pix_key_type: string | null
  pix_beneficiary_name: string | null
  pix_qr_code_url: string | null
}

type Props = {
  initial: PixConfig
  saveAction: (data: PixConfig) => Promise<{ error?: string; success?: boolean }>
}

const KEY_TYPE_LABELS: Record<string, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'E-mail',
  phone: 'Telefone',
  random: 'Chave Aleatória',
}

export default function PixConfigSection({ initial, saveAction }: Props) {
  const [form, setForm] = useState<PixConfig>({
    pix_key: initial.pix_key || '',
    pix_key_type: initial.pix_key_type || 'random',
    pix_beneficiary_name: initial.pix_beneficiary_name || '',
    pix_qr_code_url: initial.pix_qr_code_url || '',
  })
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveAction(form)
      if (result.error) {
        setStatus('error')
        setErrorMsg(result.error)
      } else {
        setStatus('ok')
        setTimeout(() => setStatus('idle'), 3000)
      }
    })
  }

  return (
    <section className="card" style={{ padding: '0', overflow: 'hidden', marginBottom: '2rem', border: '1px solid rgba(37,211,102,0.25)' }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.3rem' }}>💸</span>
        <div>
          <h3 style={{ margin: 0 }}>Configuração de PIX</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Chave e QR Code exibidos para os alunos na tela de pagamento.
          </p>
        </div>
      </div>

      <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Tipo de chave */}
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tipo de Chave
          </label>
          <select
            value={form.pix_key_type || 'random'}
            onChange={e => setForm(f => ({ ...f, pix_key_type: e.target.value }))}
            style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.9rem' }}
          >
            {Object.entries(KEY_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {/* Chave PIX */}
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Chave PIX
          </label>
          <input
            type="text"
            value={form.pix_key || ''}
            onChange={e => setForm(f => ({ ...f, pix_key: e.target.value }))}
            placeholder="Ex: 47997710603 ou seu@email.com"
            style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.9rem' }}
          />
        </div>

        {/* Nome do beneficiário */}
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Nome do Beneficiário
          </label>
          <input
            type="text"
            value={form.pix_beneficiary_name || ''}
            onChange={e => setForm(f => ({ ...f, pix_beneficiary_name: e.target.value }))}
            placeholder="Ex: Melissa Souza"
            style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.9rem' }}
          />
        </div>

        {/* URL do QR Code (imagem) */}
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            URL do QR Code (opcional)
          </label>
          <input
            type="url"
            value={form.pix_qr_code_url || ''}
            onChange={e => setForm(f => ({ ...f, pix_qr_code_url: e.target.value }))}
            placeholder="https://... (cole a URL da imagem do QR Code)"
            style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.9rem' }}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Gere o QR no app do seu banco e cole a URL aqui. Se não tiver URL, o aluno poderá copiar a chave manualmente.
          </p>
        </div>

        {/* Preview */}
        {form.pix_qr_code_url && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)' }}>
            <img src={form.pix_qr_code_url} alt="Preview QR" style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '8px' }} />
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Preview do QR Code</div>
          </div>
        )}

        {/* Status messages */}
        {status === 'ok' && <p style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>✓ Configuração salva com sucesso!</p>}
        {status === 'error' && <p style={{ color: 'var(--error)', fontSize: '0.85rem' }}>✗ {errorMsg}</p>}

        <button
          onClick={handleSave}
          disabled={isPending}
          className="btn-primary"
          style={{ alignSelf: 'flex-start', padding: '0.75rem 2rem', opacity: isPending ? 0.7 : 1 }}
        >
          {isPending ? 'Salvando...' : 'Salvar Configuração PIX'}
        </button>
      </div>
    </section>
  )
}
