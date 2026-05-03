'use client';

import React from 'react';
import Logo from './Logo';
import Link from 'next/link';

const Footer: React.FC = () => {
  return (
    <footer id="contato" style={{ 
      backgroundColor: '#0f0f0f', 
      color: '#FFFFFF', 
      padding: '8rem 1.5rem 4rem',
      borderTop: '1px solid rgba(255,255,255,0.03)',
      position: 'relative',
      zIndex: 10
    }}>
      <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '5rem',
          marginBottom: '6rem'
        }}>
          {/* Column 1: Brand */}
          <div style={{ gridColumn: 'span 1' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'flex-start' }}>
              <Logo width={32} orientation="horizontal" textColor="#FFFFFF" />
            </div>
            <p style={{ color: '#9CA3AF', lineHeight: 1.8, fontSize: '1rem', fontWeight: 500 }}>
              Fluência com acompanhamento individual. Inglês com estratégia real.
            </p>
          </div>

          {/* Column 2: Plataforma */}
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '2rem', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Plataforma</h4>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <li><Link href="/login" className="footer-link">Entrar</Link></li>
              <li><Link href="/register" className="footer-link">Matricular-se</Link></li>
              <li><Link href="/eventos" className="footer-link">Eventos Gratuitos</Link></li>
            </ul>
          </div>

          {/* Column 3: Legal */}
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '2rem', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legal</h4>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <li><Link href="/privacy" className="footer-link">Privacidade</Link></li>
              <li><Link href="/terms" className="footer-link">Termos de Uso</Link></li>
            </ul>
          </div>

          {/* Column 4: Contato */}
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '2rem', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contato</h4>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <li style={{ color: '#9CA3AF', fontSize: '0.95rem' }}>suporte@edacademy.com</li>
              <li>
                <a 
                  href="https://wa.me/5547997710603" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="footer-link"
                >
                  WhatsApp Melissa
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{ 
          borderTop: '1px solid rgba(255,255,255,0.05)', 
          paddingTop: '3rem', 
          textAlign: 'center'
        }}>
          <p style={{ color: '#6B7280', fontSize: '0.9rem', fontWeight: 500 }}>
            &copy; {new Date().getFullYear()} EdAcademy. Todos os direitos reservados.
          </p>
        </div>
      </div>

      <style jsx>{`
        .footer-link {
          color: #9CA3AF;
          text-decoration: none;
          font-size: 0.95rem;
          font-weight: 500;
          transition: all 0.3s ease;
        }
        .footer-link:hover {
          color: var(--primary);
          transform: translateX(4px);
        }
        @media (max-width: 768px) {
          footer { padding: 6rem 1.5rem 3rem !important; }
          div[style*="gridTemplateColumns"] {
            grid-template-columns: 1fr !important;
            gap: 4rem !important;
            text-align: center;
          }
          div[style*="gridColumn: span 1"] {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .footer-link:hover {
            transform: none;
          }
        }
      `}</style>
    </footer>
  );
};

export default Footer;
