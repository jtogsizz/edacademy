import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function StudentChatLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // bora listar todos os profs disponiveis na base
  const { data: admins } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('role', ['admin', 'admin_master'])
    .order('full_name', { ascending: true })

  return (
    <div style={{ display: 'flex', height: 'calc(100dvh - 80px)', overflow: 'hidden', backgroundColor: 'var(--bg-main)' }}>
      <aside className="chat-sidebar" style={{ width: '350px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-card)' }}>
        <header style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-main)' }}>
          <div style={{ marginBottom: '1rem', display: 'none' }}>
            <Link href="/dashboard" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textDecoration: 'underline' }}>&larr; Voltar pro Dashboard</Link>
          </div>
          <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Chat</h2>
        </header>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {admins?.map((s) => {
              const avatar = s.avatar_url || "/default-avatar.svg"

              return (
                <li key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <Link href={`/dashboard/chat/${s.id}`} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', transition: 'background 0.2s', color: 'inherit', textDecoration: 'none' }} className="chat-row-hover">
                    <img src={avatar} alt="Foto Professor" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '0.2rem' }}>Prof. {s.full_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Toque para abrir a conversa</div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </aside>

      <main className="chat-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {children}
      </main>

      {/* injeta o css gambiarra de responsivo igual do admin */}
      <style dangerouslySetInnerHTML={{__html: `
        .chat-row-hover:hover {
          background-color: var(--bg-main);
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
