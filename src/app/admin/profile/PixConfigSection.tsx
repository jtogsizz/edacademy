'use client'

import { useState } from 'react'

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
  const [open, setOpen] = useState(false) // ← starts collapsed
  const [form, setForm] = useState<PixConfig>({
    pix_key: initial.pix_key || '',
    pix_key_type: initial.pix_key_type || 'random',
    pix_beneficiary_name: initial.pix_beneficiary_name || '',
    pix_qr_code_url: initial.pix_qr_code_url || '',
  })
  const [qrFile, setQrFile] = useState<File | null>(null)
  const [qrPreview, setQrPreview] = useState<string | null>(initial.pix_qr_code_url)
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [isPending, setIsPending] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Por favor, selecione uma imagem.')
        setStatus('error')
        return
      }
      setQrFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setQrPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    setStatus('idle')
    setIsPending(true)
    try {
      let finalUrl = form.pix_qr_code_url

      if (qrFile) {
        const { createClient } = await import('@/utils/supabase/client')
        const supabase = createClient()
        const fileName = `pix-qr-${Date.now()}-${qrFile.name.replace(/\s+/g, '_')}`
        const { data, error: uploadError } = await supabase.storage
          .from('posts')
          .upload(fileName, qrFile)

        if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}`)

        const { data: { publicUrl } } = supabase.storage.from('posts').getPublicUrl(data.path)
        finalUrl = publicUrl
      }

      const result = await saveAction({ ...form, pix_qr_code_url: finalUrl })
      if (result.error) {
        setStatus('error')
        setErrorMsg(result.error)
      } else {
        setStatus('ok')
        setForm(f => ({ ...f, pix_qr_code_url: finalUrl }))
        setQrFile(null)
        setTimeout(() => setStatus('idle'), 3000)
      }
    } catch (e: any) {
      setStatus('error')
      setErrorMsg(e.message)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <section className="card" style={{ padding: '0', overflow: 'hidden', marginBottom: '2rem', border: '1px solid var(--border)' }}>
      {/* Header — always visible, click to toggle */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 1.75rem', background: 'none', border: 'none', cursor: 'pointer',
          borderBottom: open ? '1px solid var(--border)' : 'none',
          textAlign: 'left',
          transition: 'background 0.15s',
        }}
        aria-expanded={open}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
            <line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>Configuração de PIX</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
              Chave e QR Code exibidos para os alunos na tela de pagamento
            </div>
          </div>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          style={{ transition: 'transform 0.2s ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0, color: 'var(--text-muted)' }}
        >
          <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Collapsible body */}
      <div style={{
        maxHeight: open ? '1000px' : '0',
        overflow: 'hidden',
        transition: 'max-height 0.3s ease',
      }}>
        <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Tipo de chave */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
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
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
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
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
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

          {/* Upload do QR Code */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Imagem do QR Code
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} id="qr-upload" />
              <label htmlFor="qr-upload" className="btn-outline" style={{ cursor: 'pointer', padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}>
                {qrFile ? 'Trocar arquivo' : 'Selecionar Imagem'}
              </label>
              {qrPreview && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <img src={qrPreview} alt="QR Code" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border)' }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{qrFile ? qrFile.name : 'Imagem atual'}</span>
                </div>
              )}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              O QR Code aparecerá no modal de pagamento para o aluno.
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
      </div>
    </section>
  )
}
