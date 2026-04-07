"use client"

import { useState } from 'react'
import ProfileAvatarUpload from './ProfileAvatarUpload'
import ProfileEditForm from './ProfileEditForm'

interface ProfileEditContainerProps {
  userId: string
  initialProfile: {
    full_name: string | null
    whatsapp_number: string | null
    instagram_handle: string | null
    avatar_url: string | null
  }
  isReadOnly?: boolean
  saveAction: (fullName: string, whatsapp: string, instagram?: string) => Promise<{ success?: boolean; error?: string }>
}

export default function ProfileEditContainer({ 
  userId, 
  initialProfile, 
  isReadOnly = false, 
  saveAction 
}: ProfileEditContainerProps) {
  const [isAvatarUploading, setIsAvatarUploading] = useState(false)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem', flexWrap: 'wrap', width: '100%' }}>
      {/* Lado Esquerdo: Avatar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
        <ProfileAvatarUpload 
          currentAvatarUrl={initialProfile.avatar_url} 
          userId={userId} 
          size="120px"
          isUploading={isAvatarUploading}
          onUploadStart={() => setIsAvatarUploading(true)}
          onUploadEnd={() => setIsAvatarUploading(false)}
        />
        <div style={{ textAlign: 'center' }}>
          <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{initialProfile.full_name}</h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Foto de Perfil</p>
        </div>
      </div>

      {/* Lado Direito: Formulário */}
      <div style={{ flex: 1, minWidth: '280px' }}>
        <ProfileEditForm 
          initialFullName={initialProfile.full_name || ''} 
          initialWhatsapp={initialProfile.whatsapp_number || ''} 
          initialInstagram={initialProfile.instagram_handle || ''}
          isReadOnly={isReadOnly}
          isAvatarUploading={isAvatarUploading}
          saveAction={saveAction}
        />
      </div>
    </div>
  )
}
