"use client"

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Logo from '@/components/Logo'
import Link from 'next/link'

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleGoogleRegister() {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <Logo />
        </div>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '1.25rem' }}>Criar Nova Conta</h2>
        
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
          Junte-se à EdAcademy usando sua conta do Google. Todos os novos perfis passarão por aprovação.
        </p>

        <button 
          onClick={handleGoogleRegister} 
          className="btn-primary" 
          disabled={loading} 
          style={{ width: '100%', marginBottom: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', backgroundColor: '#fff', color: '#000', border: '1px solid var(--border)' }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {loading ? 'Redirecionando...' : 'Cadastrar com Google'}
        </button>

        <p style={{ marginTop: '0.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Já tem uma conta? <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 500 }}>Fazer Login</Link>
        </p>
      </div>
    </div>
  )
}
