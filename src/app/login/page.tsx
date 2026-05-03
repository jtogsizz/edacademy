"use client"

import { useState, Suspense } from 'react'
import { createClient } from '@/utils/supabase/client'
import Logo from '@/components/Logo'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import SupportContactCard from '@/components/SupportContactCard'
import { getAppUrl } from '@/utils/url'

// Usamos um componente interno para encapsular o useSearchParams dentro de um Suspense boundary
function LoginForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showEmailFields, setShowEmailFields] = useState(false)
  const supabase = createClient()
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')
  const messageParam = searchParams.get('message')

  let errorMessage = error || null
  if (errorParam === 'not_authorized') {
    errorMessage = "Seu e-mail não está autorizado para acessar a plataforma. Para mais informações, entre em contato com o suporte."
  } else if (errorParam === 'auth_failed') {
    errorMessage = "Falha na autenticação. Tente novamente."
  }

  async function handleGoogleLogin() {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${getAppUrl()}/auth/callback`,
      },
    })
  }

  async function handleEmailLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
      setError(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message)
      setLoading(false)
    } else {
      window.location.href = '/dashboard'
    }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
        <Logo />
      </div>
      <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 800 }}>Entrar na plataforma</h2>
      
      {messageParam && (
        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          {messageParam}
        </div>
      )}

      {errorMessage && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center' }}>
          {errorMessage}
        </div>
      )}

      {/* AÇÃO PRINCIPAL: GOOGLE */}
      <button 
        onClick={handleGoogleLogin} 
        className="btn-outline" 
        disabled={loading} 
        style={{ 
          width: '100%', 
          marginBottom: '1.5rem', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          gap: '0.5rem', 
          backgroundColor: '#fff', 
          color: '#000', 
          border: '1px solid var(--border)', 
          padding: '0.9rem',
          fontSize: '1rem',
          fontWeight: 600
        }}
      >
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        Entrar com Google
      </button>

      {/* LOGIN POR E-MAIL DISCRETO (Para Leads/Eventos) */}
      {!showEmailFields ? (
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <button 
            onClick={() => setShowEmailFields(true)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Já sou cadastrado via e-mail (Eventos)
          </button>
        </div>
      ) : (
        <form onSubmit={handleEmailLogin} className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'rgba(0,0,0,0.02)' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>E-mail</label>
            <input name="email" type="email" required placeholder="voce@exemplo.com" style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.9rem' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>Senha</label>
            <input name="password" type="password" required placeholder="••••••••" style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.9rem' }} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '0.7rem', fontSize: '0.9rem' }}>
            {loading ? 'Entrando...' : 'Entrar com E-mail'}
          </button>
          <button type="button" onClick={() => setShowEmailFields(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer' }}>
            Voltar
          </button>
        </form>
      )}

      {errorParam === 'not_authorized' && (
        <SupportContactCard />
      )}

      <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        Ainda não tem conta? <Link href="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>Cadastrar-se</Link>
      </p>
    </>
  )
}

export default function LoginPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column' }}>
        <Suspense fallback={<div style={{ textAlign: 'center', padding: '2rem' }}>Carregando...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
