"use client"
import { SendIcon } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

const MOCK_EMOJIS = ['❤️', '👍', '😂', '👋', '🎯']

type Message = {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  msg_type: 'text' | 'emoji'
  created_at: string
}

type Props = {
  initialMessages: Message[]
  myUserId: string
  chatPartnerId: string
  chatPartnerName: string
  chatPartnerAvatarUrl: string | null
  sendAction: (content: string, type: 'text' | 'emoji') => Promise<any>
  backHref: string
}

export default function ChatClientView({ initialMessages, myUserId, chatPartnerId, chatPartnerName, chatPartnerAvatarUrl, sendAction, backHref }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // fallback bonito se vier sem foto
  const partnerAvatar = chatPartnerAvatarUrl || "/default-avatar.svg"

  // aqui a mágica do scroll que a gnt discutiu rola
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // da um scrollzin maroto logo que carregar a pagina
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // escuta as msgs novas em tempo real sem fazer reload
  useEffect(() => {
    const supabase = createClient()

    // filtra pelo canal da conversa entre esses dois usuarios especificos
    const channel = supabase
      .channel(`chat:${[myUserId, chatPartnerId].sort().join('-')}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new as Message

          // ignora mensagem que nao e dessa conversa
          const isThisConversation =
            (newMsg.sender_id === myUserId && newMsg.receiver_id === chatPartnerId) ||
            (newMsg.sender_id === chatPartnerId && newMsg.receiver_id === myUserId)

          if (!isThisConversation) return

          // evita duplicar mensagem que o proprio usuario ja adicionou otimisticamente
          setMessages(prev => {
            const alreadyExists = prev.some(m => m.id === newMsg.id)
            if (alreadyExists) return prev
            // tb remove o fake otimístico se for msg propria (troca pelo id real)
            const withoutFakes = newMsg.sender_id === myUserId
              ? prev.filter(m => !m.id.includes('-') || m.id === newMsg.id)
              : prev
            return [...withoutFakes, newMsg]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [myUserId, chatPartnerId])

  // atualizo local de forma optimística pro envio nao ficar engasgando o visual
  const handleSend = async (val: string, type: 'text' | 'emoji') => {
    if (!val.trim()) return
    const fakeId = Math.random().toString()
    
    setMessages(prev => [...prev, {
      id: fakeId,
      sender_id: myUserId,
      receiver_id: chatPartnerId,
      content: val,
      msg_type: type,
      created_at: new Date().toISOString()
    }])

    setLoading(true)
    // jogo o B.O pro servidor
    await sendAction(val, type)
    setLoading(false)
    setContent("")
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        :root { --show-sidebar: none; --show-main: flex; } /* no mobile, se ele ta num chat especifico, esconde a lista */
      `}} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--bg-main)' }}>
        
        {/* Topbar Fixa do Chat */}
        <header style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
          <Link href={backHref} className="md-hidden" style={{ fontSize: '1.25rem', color: 'var(--primary)', textDecoration: 'none' }}>
             &larr;
          </Link>
          <img src={partnerAvatar} alt="Avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>{chatPartnerName}</h2>
        </header>

        {/* Historico do Chat (Scrollable Area) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {messages.map(msg => {
            const isMe = msg.sender_id === myUserId
            const isEmoji = msg.msg_type === 'emoji'

            return (
              <div key={msg.id} className="chat-bubble-container" style={{ justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                  {isEmoji ? (
                    <div style={{ fontSize: '4rem', filter: 'drop-shadow(0 4px 4px rgba(0,0,0,0.2))', animation: 'bounce 0.5s', lineHeight: '1' }}>
                      {msg.content}
                    </div>
                  ) : (
                    <div className={`chat-bubble ${isMe ? 'chat-bubble-sent' : 'chat-bubble-received'}`}>
                      {msg.content}
                      <span className="chat-time">
                        {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  )}
                  {isEmoji && (
                    <span className="chat-time" style={{ marginTop: '0.25rem' }}>
                      {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
          
          {messages.length === 0 && (
             <div style={{ margin: 'auto', color: 'var(--text-muted)', fontSize: '0.9rem', backgroundColor: 'var(--bg-card)', padding: '0.5rem 1rem', borderRadius: '16px' }}>
               Essa conversa é o início de tudo. Manda o primeiro alô!
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Area Fixo */}
        <div style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--border)', flexShrink: 0, paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
          <div style={{ display: 'flex', gap: '0.5rem', paddingBottom: '0.5rem' }}>
            {MOCK_EMOJIS.map(emo => (
              <button 
                key={emo} 
                onClick={() => handleSend(emo, 'emoji')}
                disabled={loading}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', outline: 'none', transition: 'transform 0.1s' }}
                title="Sticker rápido"
              >
                {emo}
              </button>
            ))}
          </div>

          <form 
             onSubmit={(e) => { e.preventDefault(); handleSend(content, 'text') }} 
             style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
          >
            <input 
              type="text"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Digite uma mensagem..."
              style={{ flex: 1, padding: '0.8rem 1.25rem', borderRadius: '9999px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }}
              disabled={loading}
            />
            <button 
               type="submit" 
               disabled={loading || !content.trim()} 
               style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: content.trim() ? 'pointer' : 'not-allowed', opacity: content.trim() ? 1 : 0.5 }}
            >
              <SendIcon size={18} />
            </button>
          </form>
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          @media (min-width: 769px) {
            .md-hidden { display: none !important; }
          }
        `}} />
      </div>
    </>
  )
}
