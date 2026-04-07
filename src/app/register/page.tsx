"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          whatsapp_number: whatsappNumber,
        }
      }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      router.refresh()
      router.push('/dashboard')
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Criar Nova Conta</h2>
        
        {error && (
          <div style={{ backgroundColor: 'var(--error-bg)', color: 'var(--error)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="fullName" style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>Nome Completo</label>
            <input 
              type="text" 
              id="fullName" 
              value={fullName} 
              onChange={e => setFullName(e.target.value)} 
              required
              placeholder="Ex: João da Silva"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="email" style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>Email</label>
            <input 
              type="email" 
              id="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required
              placeholder="seu@email.com"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="whatsapp" style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>WhatsApp</label>
            <input 
              type="tel" 
              id="whatsapp" 
              value={whatsappNumber} 
              onChange={e => setWhatsappNumber(e.target.value)} 
              required
              placeholder="Ex: 11988887777"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="password" style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>Senha</label>
            <input 
              type="password" 
              id="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required
              placeholder="Sua senha (mín. 6 chars)"
              minLength={6}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Criando Conta...' : 'Cadastrar'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Já tem uma conta? <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 500 }}>Fazer Login</Link>
        </p>
      </div>
    </div>
  )
}
