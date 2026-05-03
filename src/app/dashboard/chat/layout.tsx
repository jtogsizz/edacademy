import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ChatSidebar from '@/components/ChatSidebar'

export default async function StudentChatLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  return (
    <div style={{ display: 'flex', height: 'calc(100dvh - 80px)', overflow: 'hidden', backgroundColor: 'var(--bg-main)' }}>
      <ChatSidebar myUserId={user.id} myRole={profile?.role || 'student'} basePath="/dashboard/chat" />

      <main className="chat-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {children}
      </main>

      {/* injeta o css gambiarra de responsivo igual do admin */}
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
