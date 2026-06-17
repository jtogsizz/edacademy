"use client"

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

type Profile = {
  id: string
  full_name: string
  avatar_url: string | null
  role: string
  last_message: string | null
  last_message_time: string | null
}

type ChatSidebarProps = {
  myUserId: string
  myRole: string
  basePath: string // '/dashboard/chat' ou '/admin/chat'
}

export default function ChatSidebar({ myUserId, myRole, basePath }: ChatSidebarProps) {
  const pathname = usePathname()
  const activePartnerId = pathname.split('/').pop() // Ex: '/dashboard/chat/123' -> '123'
  
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [unreadMap, setUnreadMap] = useState<Record<string, boolean>>({})

  const activePartnerIdRef = useRef(activePartnerId)
  
  // Atualiza a ref e reseta bolinha não lida ao abrir o chat
  useEffect(() => {
    activePartnerIdRef.current = activePartnerId
    if (activePartnerId) {
      setUnreadMap(prev => ({ ...prev, [activePartnerId]: false }))
    }
  }, [activePartnerId])

  // O aluno pode buscar admin, admin_master, suporte, dev.
  // Staff pode buscar qualquer um.
  // A query principal trará os contatos recentes, mas se houver busca, trará os resultados da busca.

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true)
      const supabase = createClient()
      
      const { data, error } = await supabase.rpc('search_chat_users', {
        search_term: search.trim()
      })

      if (data) setUsers(data as Profile[])
      if (error) console.error("Erro na busca segura do chat:", error)
      
      setLoading(false)
    }

    // Debounce na busca
    const timer = setTimeout(() => {
      fetchUsers()
    }, 300)

    return () => clearTimeout(timer)
  }, [search, myRole, myUserId])

  // Realtime
  useEffect(() => {
    if (!myUserId) return
    const supabase = createClient()

    // 1. Canal para mensagens recebidas (Atualiza ordem e marca não lida)
    const channelReceived = supabase.channel('sidebar-received')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${myUserId}` },
        (payload) => {
          const newMsg = payload.new
          const senderId = newMsg.sender_id

          setUsers(prev => {
            const existing = prev.find(u => u.id === senderId)
            if (!existing) return prev
            
            const updatedProfile = { ...existing, last_message: newMsg.content, last_message_time: newMsg.created_at }
            const filtered = prev.filter(u => u.id !== senderId)
            return [updatedProfile, ...filtered] // Move para o topo
          })

          const currentActive = activePartnerIdRef.current
          if (currentActive !== senderId) {
            setUnreadMap(prev => ({ ...prev, [senderId]: true }))
          }
        }
      )
      .subscribe()

    // 2. Canal para mensagens enviadas (Reflete envio por outra aba/celular)
    const channelSent = supabase.channel('sidebar-sent')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${myUserId}` },
        (payload) => {
          const newMsg = payload.new
          const receiverId = newMsg.receiver_id

          setUsers(prev => {
            const existing = prev.find(u => u.id === receiverId)
            if (!existing) return prev
            
            const updatedProfile = { ...existing, last_message: newMsg.content, last_message_time: newMsg.created_at }
            const filtered = prev.filter(u => u.id !== receiverId)
            return [updatedProfile, ...filtered]
          })
          
          setUnreadMap(prev => ({ ...prev, [receiverId]: false }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channelReceived)
      supabase.removeChannel(channelSent)
    }
  }, [myUserId])

  return (
    <aside className="chat-sidebar" style={{ width: '350px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-card)' }}>
      <header style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Conversas
        </h2>
        
        <div style={{ position: 'relative' }}>
          <input 
            type="text" 
            placeholder="Buscar usuário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.6rem 1rem 0.6rem 2.25rem', 
              borderRadius: '99px', 
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-hover)',
              fontSize: '0.9rem',
              outline: 'none'
            }} 
          />
          <svg style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Buscando...</div>}
        
        {!loading && users.length === 0 && (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Nenhum usuário encontrado.
          </div>
        )}

        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {users.map((s) => {
            const avatar = s.avatar_url || "/default-avatar.svg"
            const isActive = activePartnerId === s.id
            const isUnread = unreadMap[s.id]

            return (
              <li key={s.id} style={{ borderBottom: '1px solid var(--border)', backgroundColor: isActive ? 'var(--bg-main)' : 'transparent' }}>
                <div className="chat-row-hover" style={{ display: 'flex', alignItems: 'center', padding: '1rem 1.5rem', transition: 'background 0.2s', backgroundColor: isActive ? 'var(--bg-main)' : 'transparent', textDecoration: 'none' }}>
                  <Link href={`?viewUser=${s.id}`} scroll={false} style={{ position: 'relative', flexShrink: 0, textDecoration: 'none' }}>
                    <Image src={avatar} alt="Foto" width={42} height={42} style={{ borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)', display: 'block' }} />
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', backgroundColor: 'var(--success)', borderRadius: '50%', border: '2px solid var(--bg-card)' }}></div>
                  </Link>
                  <Link href={`${basePath}/${s.id}`} style={{ flex: 1, overflow: 'hidden', color: 'inherit', textDecoration: 'none', marginLeft: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.1rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: isUnread ? 'var(--text-main)' : 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.full_name}
                      </div>
                      {isUnread && <div style={{ width: '8px', height: '8px', backgroundColor: 'var(--primary)', borderRadius: '50%', flexShrink: 0 }}></div>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: isUnread ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: isUnread ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.last_message || 'Toque para iniciar conversa'}
                    </div>
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </aside>
  )
}
