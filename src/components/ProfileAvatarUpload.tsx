"use client"

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { updateProfileAvatar } from '@/app/dashboard/actions'

interface Props {
  currentAvatarUrl: string | null
  userId: string
  size?: string
  isUploading: boolean
  onUploadStart: () => void
  onUploadEnd: () => void
}

export default function ProfileAvatarUpload({
  currentAvatarUrl,
  userId,
  size = '80px',
  isUploading: parentLoading,
  onUploadStart,
  onUploadEnd,
}: Props) {
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset state
    setStatus('idle')
    setErrorMsg(null)

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setStatus('error')
      setErrorMsg('Use JPEG, PNG ou WebP.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setStatus('error')
      setErrorMsg('Máximo 5MB.')
      return
    }

    onUploadStart()

    // Preview local imediato
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)

    try {
      const supabase = createClient()

      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/${Date.now()}.${fileExt}`

      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(data.path)

      // Salva a URL no banco
      const res = await updateProfileAvatar(publicUrl)
      if (res.error) throw new Error(res.error)

      setStatus('success')
      setTimeout(() => setStatus('idle'), 4000)

      router.refresh()
    } catch (err: any) {
      setStatus('error')
      setErrorMsg(err.message || 'Erro ao salvar foto.')
      setPreview(currentAvatarUrl)
    } finally {
      URL.revokeObjectURL(objectUrl)
      onUploadEnd()
    }
  }

  const sizeNum = parseInt(size)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
      {/* Círculo clicável */}
      <div
        style={{
          position: 'relative',
          width: size,
          height: size,
          flexShrink: 0,
          cursor: parentLoading ? 'not-allowed' : 'pointer',
        }}
        onClick={() => !parentLoading && fileInputRef.current?.click()}
        title="Clique para trocar a foto"
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid var(--bg-card)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            backgroundColor: 'var(--primary-light)',
          }}
        >
          <img
            src={preview || '/default-avatar.svg'}
            alt="Foto de perfil"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: parentLoading ? 0.4 : 1,
              transition: 'opacity 0.2s',
            }}
          />
        </div>

        {/* Overlay de loading */}
        {parentLoading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              backgroundColor: 'rgba(0,0,0,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: '22px',
                height: '22px',
                border: '2px solid white',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
          </div>
        )}

        {/* Ícone de câmera quando idle */}
        {!parentLoading && (
          <div
            style={{
              position: 'absolute',
              bottom: '2px',
              right: '2px',
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/jpg,image/png,image/webp"
        style={{ display: 'none' }}
        disabled={parentLoading}
      />

      {/* Feedback de status inline */}
      <div style={{ textAlign: 'center', minHeight: '20px' }}>
        {parentLoading && (
          <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 500 }}>
            Enviando foto...
          </span>
        )}
        {!parentLoading && status === 'success' && (
          <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 500 }}>
            ✓ Foto salva!
          </span>
        )}
        {!parentLoading && status === 'error' && (
          <span style={{ fontSize: '0.75rem', color: 'var(--error)' }}>
            {errorMsg}
          </span>
        )}
        {!parentLoading && status === 'idle' && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Clique para trocar
          </span>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
    </div>
  )
}
