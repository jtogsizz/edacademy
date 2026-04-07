"use client"

import { useState, useTransition } from 'react'

interface ProfileEditFormProps {
  initialFullName: string
  initialWhatsapp: string
  initialInstagram?: string
  isReadOnly?: boolean
  isAvatarUploading?: boolean
  saveAction: (
    fullName: string,
    whatsapp: string,
    instagram?: string
  ) => Promise<{ success?: boolean; error?: string }>
}

export default function ProfileEditForm({
  initialFullName,
  initialWhatsapp,
  initialInstagram,
  isReadOnly = false,
  isAvatarUploading = false,
  saveAction,
}: ProfileEditFormProps) {
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isReadOnly || isAvatarUploading) return

    const formData = new FormData(e.currentTarget)
    const fullName = formData.get('fullName') as string
    const whatsapp = formData.get('whatsapp') as string
    const instagram = (formData.get('instagram') as string) || undefined

    setSuccess(false)
    setError(null)

    startTransition(async () => {
      try {
        const res = await saveAction(fullName, whatsapp, instagram)
        if (res?.error) {
          setError(res.error)
        } else {
          setSuccess(true)
          setTimeout(() => setSuccess(false), 3000)
        }
      } catch {
        setError('Erro ao salvar. Tente novamente.')
      }
    })
  }

  const fieldStyle = {
    cursor: isReadOnly ? 'not-allowed' : 'text',
    backgroundColor: isReadOnly ? 'var(--bg-main)' : 'transparent',
    opacity: isReadOnly ? 0.75 : 1,
  } as React.CSSProperties

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          Nome Completo
        </label>
        <input
          name="fullName"
          defaultValue={initialFullName}
          required
          placeholder="Seu nome"
          disabled={isPending || isReadOnly || isAvatarUploading}
          style={fieldStyle}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          WhatsApp
        </label>
        <input
          name="whatsapp"
          defaultValue={initialWhatsapp}
          placeholder="Ex: 11999999999"
          disabled={isPending || isReadOnly || isAvatarUploading}
          style={fieldStyle}
        />
      </div>

      {initialInstagram !== undefined && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Instagram
          </label>
          <input
            name="instagram"
            defaultValue={initialInstagram}
            placeholder="@seuusuario"
            disabled={isPending || isReadOnly || isAvatarUploading}
            style={fieldStyle}
          />
        </div>
      )}

      {/* Aviso para aluno: campos bloqueados */}
      {isReadOnly && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
          Dados cadastrais gerenciados pelo administrador.
        </p>
      )}

      {/* Aviso de upload em andamento */}
      {isAvatarUploading && (
        <p style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 500, margin: 0 }}>
          Aguarde o upload da foto terminar...
        </p>
      )}

      {error && (
        <div style={{ color: 'var(--error)', fontSize: '0.85rem' }}>{error}</div>
      )}
      {success && (
        <div style={{ color: 'var(--success)', fontSize: '0.85rem' }}>
          ✓ Alterações salvas com sucesso!
        </div>
      )}

      {/* Botão só aparece para admins (isReadOnly = false) */}
      {!isReadOnly && (
        <div className="save-button-container" style={{ marginTop: '0.25rem' }}>
          <button
            type="submit"
            disabled={isPending || isAvatarUploading}
            className="btn-primary"
            style={{
              opacity: isPending || isAvatarUploading ? 0.65 : 1,
              gap: '0.5rem',
              transition: 'opacity 0.2s',
            }}
          >
            {isPending ? (
              <>
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid white',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    flexShrink: 0,
                  }}
                />
                Salvando...
              </>
            ) : isAvatarUploading ? (
              'Aguarde...'
            ) : (
              'Salvar Alterações'
            )}
          </button>
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes spin { to { transform: rotate(360deg); } }
          @media (max-width: 600px) {
            .save-button-container { width: 100%; }
            .save-button-container button { width: 100% !important; justify-content: center; }
          }
        `,
        }}
      />
    </form>
  )
}
