"use client"

import { useState } from 'react'
import ProfileAvatarUpload from './ProfileAvatarUpload'
import ProfileEditForm from './ProfileEditForm'

interface InitialProfile {
  full_name: string | null
  whatsapp_number: string | null
  instagram_handle: string | null
  avatar_url: string | null
  timezone?: string | null
  language?: string | null
  meet_url?: string | null
}

interface Props {
  userId: string
  initialProfile: InitialProfile
  isReadOnly?: boolean
  saveAction: (
    fullName: string,
    whatsapp: string,
    instagram?: string,
    timezone?: string,
    language?: string,
    meetUrl?: string
  ) => Promise<{ success?: boolean; error?: string }>
  userRole?: string
}

export default function ProfileEditContainer({
  userId,
  initialProfile,
  isReadOnly = false,
  userRole,
  saveAction,
}: Props) {
  const [isAvatarUploading, setIsAvatarUploading] = useState(false)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '2rem',
        flexWrap: 'wrap',
        width: '100%',
      }}
    >
      {/* Avatar: sempre visível, aluno pode trocar */}
      <ProfileAvatarUpload
        currentAvatarUrl={initialProfile.avatar_url}
        userId={userId}
        size="110px"
        isUploading={isAvatarUploading}
        onUploadStart={() => setIsAvatarUploading(true)}
        onUploadEnd={() => setIsAvatarUploading(false)}
      />

      {/* Formulário de dados */}
      <div style={{ flex: 1, minWidth: '240px' }}>
        <ProfileEditForm
          initialFullName={initialProfile.full_name || ''}
          initialWhatsapp={initialProfile.whatsapp_number || ''}
          initialInstagram={initialProfile.instagram_handle || ''}
          initialTimezone={initialProfile.timezone || ''}
          initialLanguage={initialProfile.language || ''}
          isReadOnly={isReadOnly}
          isAvatarUploading={isAvatarUploading}
          userRole={userRole}
          saveAction={saveAction}
        />
      </div>
    </div>
  )
}
