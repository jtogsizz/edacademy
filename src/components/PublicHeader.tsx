"use client"

import Link from 'next/link'
import Logo from './Logo'
import { useState, useEffect, useRef } from 'react'

export default function PublicHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [visible, setVisible] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      // Control background and size
      setScrolled(currentScrollY > 20)

      // Control visibility (hide on scroll down, show on scroll up)
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setVisible(false)
      } else {
        setVisible(true)
      }

      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const toggleMenu = () => setMenuOpen(!menuOpen)

  const whatsappUrl = "https://wa.me/5547997710603?text=Olá! Gostaria de saber mais sobre a EdAcademy."

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      zIndex: 2000,
      padding: scrolled ? '0.6rem 1.5rem' : '1.1rem 1.5rem',
      transition: 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
      backgroundColor: scrolled ? 'rgba(255, 255, 255, 0.85)' : 'transparent',
      backdropFilter: scrolled ? 'blur(20px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(0,0,0,0.05)' : '1px solid transparent',
      transform: visible ? 'translateY(0)' : 'translateY(-100%)',
      opacity: visible ? 1 : 0
    }}>
      <div className="container" style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {/* LOGO */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
          <Logo width={scrolled ? 30 : 36} hideText={true} />
          <span style={{ 
            fontSize: scrolled ? '1.05rem' : '1.2rem', 
            fontWeight: 900, 
            color: '#111827',
            letterSpacing: '-0.04em',
            transition: 'all 0.3s'
          }}>
            Ed<span style={{ color: 'var(--primary)' }}>Academy</span>
          </span>
        </Link>

        {/* DESKTOP NAV */}
        <nav className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <Link href="/eventos" className="nav-link">Eventos Gratuitos</Link>
            <Link href="#contato" className="nav-link">Contato</Link>
          </div>
          
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', marginLeft: '0.5rem' }}>
            <Link href="/login" className="nav-link" style={{ fontSize: '0.85rem' }}>
              Entrar
            </Link>
            <Link href="/register" className="btn-primary" style={{ 
              padding: '0.65rem 1.4rem', 
              fontSize: '0.8rem',
              fontWeight: 800,
              borderRadius: '9999px',
              boxShadow: scrolled ? '0 10px 20px rgba(234, 88, 12, 0.2)' : 'none'
            }}>
              Me matricular
            </Link>
          </div>
        </nav>

        {/* MOBILE ACTIONS */}
        <div style={{ display: 'none' }} className="mobile-actions">
           <Link href="/register" className="btn-primary" style={{ 
              padding: '0.5rem 1rem', 
              fontSize: '0.75rem',
              fontWeight: 800,
              borderRadius: '9999px',
              marginRight: '0.5rem'
            }}>
              Matricular
            </Link>
            <button 
              className="mobile-toggle"
              onClick={toggleMenu}
              style={{
                background: 'none',
                border: 'none',
                padding: '0.5rem',
                cursor: 'pointer',
                zIndex: 2001
              }}
            >
              <div style={{
                width: '20px',
                height: '2px',
                background: '#0f0f0f',
                marginBottom: '5px',
                transition: 'all 0.3s',
                transform: menuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none'
              }} />
              <div style={{
                width: '20px',
                height: '2px',
                background: '#0f0f0f',
                transition: 'all 0.3s',
                opacity: menuOpen ? 0 : 1
              }} />
              <div style={{
                width: '20px',
                height: '2px',
                background: '#0f0f0f',
                marginTop: '5px',
                transition: 'all 0.3s',
                transform: menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none'
              }} />
            </button>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      <div className={`mobile-drawer ${menuOpen ? 'open' : ''}`} style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100vh',
        backgroundColor: '#FFFFFF',
        zIndex: 1999,
        display: 'flex',
        flexDirection: 'column',
        padding: '7rem 2rem 2.5rem',
        gap: '1.5rem',
        transition: 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
        transform: menuOpen ? 'translateX(0)' : 'translateX(100%)'
      }}>
        <Link href="/eventos" className="mobile-link" onClick={() => setMenuOpen(false)}>Eventos Gratuitos</Link>
        <Link href="#contato" className="mobile-link" onClick={() => setMenuOpen(false)}>Contato</Link>
        <Link href="/login" className="mobile-link" onClick={() => setMenuOpen(false)}>Entrar na minha conta</Link>
        
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Link href="/register" className="btn-primary" style={{ 
            padding: '1.2rem', 
            textAlign: 'center',
            borderRadius: '20px',
            fontSize: '1.1rem',
            boxShadow: '0 20px 40px rgba(234, 88, 12, 0.2)'
          }} onClick={() => setMenuOpen(false)}>
            Me matricular agora
          </Link>
          <div style={{ textAlign: 'center', fontSize: '0.85rem', color: '#9CA3AF' }}>
            Acompanhamento individual e real.
          </div>
        </div>
      </div>

      <style jsx>{`
        .nav-link {
          font-weight: 700;
          color: #4B5563;
          font-size: 0.9rem;
          text-decoration: none;
          transition: all 0.2s;
          position: relative;
        }
        .nav-link:after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          width: 0;
          height: 2px;
          background: var(--primary);
          transition: width 0.3s;
        }
        .nav-link:hover {
          color: #111827;
        }
        .nav-link:hover:after {
          width: 100%;
        }
        .mobile-link {
          font-size: 1.4rem;
          font-weight: 800;
          color: #111827;
          text-decoration: none;
          border-bottom: 1px solid #F3F4F6;
          padding-bottom: 0.75rem;
          transition: padding-left 0.3s;
        }
        .mobile-link:active {
          padding-left: 10px;
          color: var(--primary);
        }
        @media (max-width: 968px) {
          .desktop-nav { display: none !important; }
          .mobile-actions { display: flex !important; align-items: center; }
        }
      `}</style>
    </header>
  )
}
