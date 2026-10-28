import type { Metadata } from 'next'
import './globals.css'
import FaqPopout from '@/components/FaqPopout'
import UserProfileDrawer from '@/components/UserProfileDrawer'
import ThemeScript from '@/components/ThemeScript'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { LocaleProvider } from '@/contexts/LocaleContext'
import { Suspense } from 'react'
import { getAppUrl } from '@/utils/url'

const appUrl = getAppUrl()

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: { default: 'EdAcademy', template: '%s | EdAcademy' },
  description: 'Plataforma de aulas de inglês e espanhol com acompanhamento individualizado, agenda integrada e suporte personalizado.',
  keywords: ['inglês', 'espanhol', 'aulas online', 'EdAcademy', 'idiomas'],
  openGraph: {
    siteName: 'EdAcademy',
    url: appUrl,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <ThemeProvider>
          <LocaleProvider>
            <main style={{ flex: 1 }}>
              {children}
            </main>

        {/* Links Fixos Sociais - Canto Inferior Esquerdo — isolados do dark mode interno */}
        <div className="public-social-links" style={{ position: 'fixed', bottom: '80px', left: '16px', zIndex: 99, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <a 
            href="#" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              fontSize: '0.8rem', 
              color: '#374151', 
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              padding: '0.4rem 0.8rem',
              borderRadius: '20px',
              border: '1px solid rgba(229,231,235,0.8)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              backdropFilter: 'blur(4px)'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            YouTube
          </a>

          <a 
            href="#" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              fontSize: '0.8rem', 
              color: '#374151', 
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              padding: '0.4rem 0.8rem',
              borderRadius: '20px',
              border: '1px solid rgba(229,231,235,0.8)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              backdropFilter: 'blur(4px)'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            Instagram Oficial
          </a>
        </div>

            {/* Global FAQ Popout */}
            <FaqPopout />

            {/* Global User Profile Drawer */}
            <Suspense fallback={null}>
              <UserProfileDrawer />
            </Suspense>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
