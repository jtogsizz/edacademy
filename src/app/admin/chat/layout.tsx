import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ChatSidebar from '@/components/ChatSidebar'

export default async function AdminChatLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  // se nao for admin mete o pé
  if (profile?.role !== 'admin' && profile?.role !== 'admin_master' && profile?.role !== 'suporte' && profile?.role !== 'dev') redirect('/dashboard')

  return (
    <div style={{ display: 'flex', height: 'calc(100dvh - 80px)', overflow: 'hidden', backgroundColor: 'var(--bg-main)' }}>
      {/* lateral estilo zap web */}
      <ChatSidebar myUserId={user.id} myRole={profile?.role || 'admin'} basePath="/admin/chat" />

      {/* miolo onde de fato a magia acontece */}
      <main className="chat-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {children}
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .chat-row-hover:hover {
          background-color: var(--bg-hover);
        }
        @media (max-width: 768px) {
          .chat-sidebar {
            width: 100% !important;
            display: var(--show-sidebar, flex) !important;
          }
          .chat-main {
            display: var(--show-main, none) !important;
          }
        }
      `}} />
    </div>
  )
}
