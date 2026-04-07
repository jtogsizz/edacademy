"use client"
import { useState } from 'react'
import { sendMessageToAdmin } from './actions'

const MOCK_EMOJIS = ['❤️', '👍', '😂', '👋', '🎯']

export default function ChatForm() {
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setLoading(true)
    await sendMessageToAdmin(content, 'text')
    setContent("")
    setLoading(false)
  }

  const handleSendEmoji = async (emoji: string) => {
    setLoading(true)
    await sendMessageToAdmin(emoji, 'emoji')
    setLoading(false)
  }

  return (
    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', backgroundColor: 'var(--bg-card)', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        {MOCK_EMOJIS.map(emo => (
          <button 
            key={emo} 
            type="button"
            onClick={() => handleSendEmoji(emo)}
            disabled={loading}
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', outline: 'none' }}
            title="Enviar Emoji"
          >
            {emo}
          </button>
        ))}
      </div>
      <form onSubmit={handleSendText} style={{ display: 'flex', gap: '0.5rem' }}>
        <input 
          type="text"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Ou digite sua mensagem..."
          style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
        />
        <button type="submit" disabled={loading || !content.trim()} className="btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
          {loading ? '...' : 'Enviar'}
        </button>
      </form>
    </div>
  )
}
