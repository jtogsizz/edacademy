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
  onUploadEnd
}: Props) {
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 1. Validação de Formato
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      setError('Por favor, selecione JPEG, PNG ou WebP.')
      return
    }

    // 2. Validação de Tamanho (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 2MB.')
      return
    }

    onUploadStart()
    setError(null)

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

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(data.path)

      // Atualizar no banco via Server Action
      const res = await updateProfileAvatar(publicUrl)
      if (res.error) throw new Error(res.error)

      router.refresh()

    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar foto.')
      setPreview(currentAvatarUrl) // Reverter
    } finally {
      URL.revokeObjectURL(objectUrl) // [REVOGAR OBJECT URL]
      onUploadEnd()
    }
  }

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {/* Círculo da Foto */}
      <div style={{ 
        width: '100%', height: '100%', borderRadius: '50%', backgroundColor: 'var(--primary-light)', 
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', 
        border: '3px solid var(--bg-card)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', cursor: (parentLoading) ? 'not-allowed' : 'pointer',
        position: 'relative'
      }} onClick={() => !parentLoading && fileInputRef.current?.click()}>
        <img 
          src={preview || '/default-avatar.svg'} 
          alt="Avatar" 
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: (parentLoading) ? 0.5 : 1 }} 
        />
        
        {parentLoading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
            <div className="spinner" style={{ width: '20px', height: '20px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
          </div>
        )}

        {/* Overlay de Hover */}
        {!parentLoading && (
          <div className="avatar-overlay" style={{ 
            position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
            opacity: 0, transition: 'opacity 0.2s ease', transitionDelay: '0.1s'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
        )}
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        style={{ display: 'none' }} 
        disabled={parentLoading}
      />

      {error && (
        <div style={{ position: 'absolute', bottom: '-25px', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontSize: '0.7rem', color: 'var(--error)' }}>
          {error}
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { to { transform: rotate(360deg); } }
        div:hover .avatar-overlay { opacity: 1 !important; }
      `}} />
    </div>
  )
}

