"use client"

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboarding } from './actions'

import { AVAILABLE_TIMEZONES } from '@/utils/timezones'

interface Props {
  initialName: string
}

export default function OnboardingForm({ initialName }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  
  // Detecção de timezone nativa do JS
  const [detectedTimezone, setDetectedTimezone] = useState<string>('America/Sao_Paulo')

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      // Verifica se o fuso detectado está na nossa lista, para não bugar o select
      const tzExists = AVAILABLE_TIMEZONES.some(t => t.value === tz)
      if (tz && tzExists) setDetectedTimezone(tz)
    } catch {
      // Keep default
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    const fullName = formData.get('fullName') as string
    const whatsapp = formData.get('whatsapp') as string
    const timezone = formData.get('timezone') as string

    if (!whatsapp.trim()) {
      setError('O WhatsApp é obrigatório para contato.')
      return
    }

    startTransition(async () => {
      const res = await completeOnboarding(fullName, whatsapp, timezone)
      if (res?.error) {
        setError(res.error)
      } else {
        // Redireciona o fluxo pra raiz. O Auth Callback ou Layout interceptará se está ativo ou inativo.
        router.refresh()
        router.push('/dashboard')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          Nome Completo
        </label>
        <input 
          name="fullName" 
          defaultValue={initialName} 
          required 
          placeholder="Ex: João da Silva"
          disabled={isPending}
          style={{ width: '100%', padding: '0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          WhatsApp (Obrigatório)
        </label>
        <input 
          name="whatsapp" 
          required 
          placeholder="Ex: 11988887777"
          disabled={isPending}
          style={{ width: '100%', padding: '0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          Fuso Horário
        </label>
        <select 
          name="timezone" 
          required 
          defaultValue={detectedTimezone}
          disabled={isPending}
          style={{ width: '100%', padding: '0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)' }}
        >
          {AVAILABLE_TIMEZONES.map(tz => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '-0.2rem' }}>
          Trocamos o seu fuso automaticamente, mas sinta-se livre para ajustar se a seleção estiver incorreta.
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.75rem', backgroundColor: 'var(--error-bg)', color: 'var(--error)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      <button 
        type="submit" 
        className="btn-primary" 
        disabled={isPending}
        style={{ marginTop: '1rem', width: '100%', opacity: isPending ? 0.6 : 1 }}
      >
        {isPending ? 'Salvando...' : 'Completar Cadastro'}
      </button>

    </form>
  )
}
