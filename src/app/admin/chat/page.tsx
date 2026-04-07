import { MessageCircle } from 'lucide-react'

export default function AdminChatEmpty() {
  return (
    <>
      {/* hack pros CSS variables resolverem se deve mostrar sidebar no mobile pra essa rota raiz */}
      <style dangerouslySetInnerHTML={{__html: `
        :root { --show-sidebar: flex; --show-main: none; }
      `}} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', backgroundColor: 'var(--bg-main)' }}>
        <MessageCircle size={64} strokeWidth={1} style={{ opacity: 0.3 }} />
        <h3 style={{ marginTop: '1rem', fontWeight: 500, color: 'var(--text-main)' }}>Pronto para fofocar?</h3>
        <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Escolha um aluno na lista da esquerda para abrir o chat.</p>
      </div>
    </>
  )
}
