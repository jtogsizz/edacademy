import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ChatClientView from '@/components/ChatClientView'
import { sendMessageToAdmin } from '../actions'

// de novo o bagulho do Next 16: params tem que usar await
export default async function StudentAdminChatPage({ params }: { params: Promise<{ adminId: string }> }) {
  const { adminId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // achando o perfil do prof
  const { data: admin } = await supabase.from('profiles').select('*').eq('id', adminId).single()
  if (!admin) {
    return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Mestre não encontrado. (ID Inválido)</div>
  }

  // puchando fofoca velha
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${adminId}),and(sender_id.eq.${adminId},receiver_id.eq.${user.id})`)
    .order('created_at', { ascending: true })

  // embrulhando a server action pro client component conseguir usar sem crashar
  const handleSend = async (content: string, type: 'text' | 'emoji') => {
    'use server'
    return await sendMessageToAdmin(adminId, content, type)
  }

  return (
    <ChatClientView 
      initialMessages={messages || []}
      myUserId={user.id}
      chatPartnerId={admin.id}
      chatPartnerName={"Prof. " + admin.full_name}
      chatPartnerAvatarUrl={admin.avatar_url}
      sendAction={handleSend}
      backHref="/dashboard/chat"
    />
  )
}
