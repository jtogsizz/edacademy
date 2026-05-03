"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

interface ProfileData {
  id: string
  full_name: string
  role: string
  avatar_url: string | null
  language: string | null
  student_language: string | null
  whatsapp_number: string | null
  instagram_handle: string | null
}

export default function UserProfileDrawer() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const viewUserId = searchParams.get('viewUser')
  
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)

  useEffect(() => {
    if (viewUserId) {
      setIsOpen(true)
      loadProfile(viewUserId)
    } else {
      setIsOpen(false)
      setTimeout(() => setProfile(null), 300) // Clear after animation
    }
  }, [viewUserId])

  const loadProfile = async (id: string) => {
    setLoading(true)
    const supabase = createClient()
    
    // Get current user role to determine what they can see
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (myProfile) setCurrentUserRole(myProfile.role)
    }

    // Fetch target profile via secure RPC
    const { data, error } = await supabase
      .rpc('get_user_profile', { target_id: id })
      .single()

    if (!error && data) {
      setProfile(data as ProfileData)
    }
    setLoading(false)
  }

  const closeDrawer = () => {
    setIsOpen(false)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('viewUser')
    const newPath = window.location.pathname + (params.toString() ? '?' + params.toString() : '')
    router.replace(newPath, { scroll: false })
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closeDrawer()
  }

  const isStaff = currentUserRole && ['admin', 'admin_master', 'suporte', 'dev'].includes(currentUserRole)

  const roleLabels: Record<string, string> = {
    student: 'Aluno',
    admin: 'Professor',
    admin_master: 'Coordenador',
    suporte: 'Equipe de Suporte',
    dev: 'Desenvolvedor'
  }

  const roleColors: Record<string, { bg: string; text: string }> = {
    student: { bg: 'var(--bg-hover)', text: 'var(--text-muted)' },
    admin: { bg: 'rgba(59, 130, 246, 0.1)', text: '#2563EB' },
    admin_master: { bg: 'var(--primary-light)', text: 'var(--primary)' },
    suporte: { bg: 'rgba(16, 185, 129, 0.1)', text: '#059669' },
    dev: { bg: 'rgba(139, 92, 246, 0.1)', text: '#7C3AED' }
  }

  const langMap: Record<string, string> = {
    english: 'Inglês 🇺🇸',
    spanish: 'Espanhol 🇪🇸'
  }

  if (!isOpen && !profile) return null

  return (
    <div
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: isOpen ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0)',
        backdropFilter: isOpen ? 'blur(8px)' : 'none',
        zIndex: 99999,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: isOpen ? 'auto' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '380px',
          backgroundColor: 'var(--bg-card)',
          boxShadow: '0 24px 50px -12px rgba(0,0,0,0.25)',
          borderRadius: '32px',
          transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(20px)',
          opacity: isOpen ? 1 : 0,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Fundo colorido no topo (banner) */}
        <div style={{ height: '120px', background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--bg-hover) 100%)', position: 'relative' }}>
          <button onClick={closeDrawer} style={{ 
            position: 'absolute', top: '16px', right: '16px',
            width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.5)', color: 'var(--text-main)', cursor: 'pointer', transition: 'all 0.2s', border: 'none', backdropFilter: 'blur(4px)'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div style={{ padding: '0 2rem 2rem 2rem', marginTop: '-60px', position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '150px', color: 'var(--text-muted)' }}>
              Carregando dados...
            </div>
          ) : profile ? (
            <>
              {/* Avatar Flutuante Centralizado */}
              <div style={{ 
                width: 120, height: 120, borderRadius: '50%', backgroundColor: 'var(--bg-card)', 
                marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', border: '4px solid var(--bg-card)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
              }}>
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '2.5rem', color: 'var(--text-muted)' }}>
                    {profile.full_name?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              
              <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.25rem 0', textAlign: 'center', fontWeight: 700 }}>{profile.full_name}</h2>
              
              <div style={{ 
                display: 'inline-flex', alignItems: 'center', padding: '0.35rem 1rem', borderRadius: '99px',
                fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                backgroundColor: roleColors[profile.role]?.bg || 'var(--bg-hover)',
                color: roleColors[profile.role]?.text || 'var(--text-muted)',
                marginBottom: '1.5rem'
              }}>
                {roleLabels[profile.role] || profile.role}
              </div>

              {/* Botão Ação Principal */}
              <div style={{ width: '100%', marginBottom: '2rem' }}>
                <Link
                  href={`/dashboard/chat?user=${profile.id}`}
                  onClick={closeDrawer}
                  className="btn-primary"
                  style={{ width: '100%', padding: '0.8rem', fontSize: '1rem', borderRadius: '16px', display: 'flex', justifyContent: 'center', boxShadow: '0 8px 16px var(--primary-light)' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  Iniciar Conversa
                </Link>
              </div>

              {/* Grid de Informações */}
              <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                
                {profile.role !== 'suporte' && profile.role !== 'dev' && (profile.language || profile.student_language) && (
                  <div style={{ padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '12px', backgroundColor: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                      🌎
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                        {profile.role === 'student' ? 'Idioma de aprendizado' : 'Idioma'}
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                        {profile.role === 'student' 
                          ? (profile.student_language ? langMap[profile.student_language] || profile.student_language : 'Não definido')
                          : (profile.language ? langMap[profile.language] || profile.language : 'Não definido')
                        }
                      </div>
                    </div>
                  </div>
                )}

                {/* Dados restritos: Apenas Staff vê */}
                {isStaff && profile.whatsapp_number && (
                  <a 
                    href={`https://wa.me/${profile.whatsapp_number.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.05)', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                  >
                     <div style={{ width: '36px', height: '36px', borderRadius: '12px', backgroundColor: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', color: 'var(--success)' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>WhatsApp</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>{profile.whatsapp_number}</div>
                    </div>
                  </a>
                )}
                
                {isStaff && profile.instagram_handle && (
                  <div style={{ padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '12px', backgroundColor: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', color: '#E1306C' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Instagram</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{profile.instagram_handle}</div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--error)', marginTop: '2rem' }}>
              Usuário não encontrado.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
