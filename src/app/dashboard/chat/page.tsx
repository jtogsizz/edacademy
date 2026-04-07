import { MessageCircle } from 'lucide-react'

export default function StudentChatEmpty() {
  return (
    <>
      {/* forçando root mode no mobile voltar pra sidebar igual fiz no admin */}
      <style dangerouslySetInnerHTML={{__html: `
        :root { --show-sidebar: flex; --show-main: none; }
      `}} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', backgroundColor: 'var(--bg-main)' }}>
        <MessageCircle size={64} strokeWidth={1} style={{ opacity: 0.3 }} />
        <h3 style={{ marginTop: '1rem', fontWeight: 500, color: 'var(--text-main)' }}>Precisa de ajuda?</h3>
        <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Escolha um Professor na lista ao lado para puxar assunto.</p>
      </div>
    </>
  )
}
