import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ChatClientView from '@/components/ChatClientView'
import { sendMessageToStudent } from './actions'

// Corrigido aqui: params agora precisa ser await na v16 do Next, senao da undefined no servidor e crasha legal a query!
export default async function AdminStudentChatPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'admin_master' && profile?.role !== 'suporte' && profile?.role !== 'dev') redirect('/dashboard')

  // Pega o coitadinho do aluno
  const { data: student } = await supabase.from('profiles').select('*').eq('id', studentId).single()
  if (!student) {
    return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Aluno não encontrado na base. (ID Inválido)</div>
  }

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${studentId}),and(sender_id.eq.${studentId},receiver_id.eq.${user.id})`)
    .order('created_at', { ascending: true })

  // Precisamos envelopar a server action aqui pra injetar o client side
  const handleSend = async (content: string, type: 'text' | 'emoji') => {
    'use server'
    // repassa pro action q faz o insert de vdd
    return await sendMessageToStudent(studentId, content, type)
  }

  return (
    <ChatClientView 
      initialMessages={messages || []}
      myUserId={user.id}
      chatPartnerId={student.id}
      chatPartnerName={student.full_name}
      chatPartnerAvatarUrl={student.avatar_url}
      sendAction={handleSend}
      backHref="/admin/chat"
    />
  )
}
