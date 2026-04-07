import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'EdAcademy',
  description: 'Gestão Inteligente de Alunos de Inglês',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <main style={{ flex: 1 }}>
          {children}
        </main>
        
        <footer style={{ 
          padding: '2rem 1.5rem', 
          borderTop: '1px solid var(--border)', 
          textAlign: 'center',
          backgroundColor: 'var(--bg-card)',
          marginTop: 'auto'
        }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            &copy; 2026 EdAcademy. Todos os direitos reservados.
          </p>
        </footer>

        {/* Link Fixo do Instagram - Canto Inferior Esquerdo */}
        <div style={{ position: 'fixed', bottom: '80px', left: '16px', zIndex: 99 }}>
          <a 
            href="https://www.instagram.com/edacademyy/" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              fontSize: '0.8rem', 
              color: 'var(--text-main)', 
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              padding: '0.4rem 0.8rem',
              borderRadius: '20px',
              border: '1px solid var(--border)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              backdropFilter: 'blur(4px)'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            Instagram Oficial
          </a>
        </div>
      </body>
    </html>
  )
}
