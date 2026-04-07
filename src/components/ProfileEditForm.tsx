"use client"

import { useState, useTransition } from 'react'

interface ProfileEditFormProps {
  initialFullName: string
  initialWhatsapp: string
  initialInstagram?: string
  saveAction: (fullName: string, whatsapp: string, instagram?: string) => Promise<{ success?: boolean; error?: string }>
}

export default function ProfileEditForm({ 
  initialFullName, 
  initialWhatsapp, 
  initialInstagram,
  saveAction 
}: ProfileEditFormProps) {
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const fullName = formData.get('fullName') as string
    const whatsapp = formData.get('whatsapp') as string
    const instagram = formData.get('instagram') as string || undefined

    setSuccess(false)
    setError(null)

    startTransition(async () => {
      try {
        const res = await saveAction(fullName, whatsapp, instagram)
        if (res?.error) {
          setError(res.error)
        } else {
          setSuccess(true)
          // Feedback visual temporário de sucesso
          setTimeout(() => setSuccess(false), 3000)
        }
      } catch (err) {
        setError('Erro ao salvar dados. Tente novamente.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Nome Completo</label>
        <input name="fullName" defaultValue={initialFullName} required placeholder="Seu nome" disabled={isPending} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>WhatsApp (Apenas números)</label>
        <input name="whatsapp" defaultValue={initialWhatsapp} placeholder="Ex: 11999999999" disabled={isPending} />
      </div>

      {initialInstagram !== undefined && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Instagram (Usuário)</label>
          <input name="instagram" defaultValue={initialInstagram} placeholder="Ex: @seuusuario" disabled={isPending} />
        </div>
      )}

      {error && <div style={{ color: 'var(--error)', fontSize: '0.85rem' }}>{error}</div>}
      {success && <div style={{ color: 'var(--success)', fontSize: '0.85rem' }}>Alterações salvas com sucesso!</div>}

      <div className="save-button-container" style={{ marginTop: '0.5rem' }}>
        <button 
          type="submit" 
          disabled={isPending} 
          className="btn-primary" 
          style={{ 
            opacity: isPending ? 0.7 : 1, 
            gap: '0.75rem',
            transition: 'all 0.2s',
            boxShadow: isPending ? 'none' : '0 4px 12px rgba(234, 88, 12, 0.25)'
          }}
        >
          {isPending ? (
            <>
              <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
              Salvando...
            </>
          ) : (
            'Salvar Alterações'
          )}
        </button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 600px) {
          .save-button-container { width: 100%; display: flex; }
          .save-button-container button { width: 100% !important; justify-content: center; }
        }
      `}} />
    </form>
  )
}
