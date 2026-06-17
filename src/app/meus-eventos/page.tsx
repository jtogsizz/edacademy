import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Logo from '@/components/Logo'
import EventCard from '@/components/EventCard'
import LogoutButton from '@/components/LogoutButton'

export default async function MeusEventosPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, is_active, timezone, role')
    .eq('id', user.id)
    .single()

  // Busca todos os eventos públicos
  const { data: allEvents } = await supabase.rpc('get_public_events')
  
  // Filtra em duas listas: Inscritos e Disponíveis
  const enrolledEvents = allEvents?.filter((e: any) => e.is_participating) || []
  const availableEvents = allEvents?.filter((e: any) => !e.is_participating) || []

  return (
    <div className="app-shell" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* HEADER COMPACTO SaaS */}
      <header style={{ 
        backgroundColor: 'var(--bg-card)', 
        borderBottom: '1px solid var(--border)',
        padding: '1rem 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Logo orientation="horizontal" width={32} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
             <LogoutButton />
          </div>
        </div>
      </header>

      <main style={{ padding: '2.5rem 1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
        
        {/* TOP SECTION: WELCOME & BANNER */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
            <div>
              <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.025em', marginBottom: '0.25rem' }}>
                Olá, {profile?.full_name?.split(' ')[0] || 'Estudante'}
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Gerencie seus eventos e acompanhe sua jornada na EdAcademy.</p>
            </div>
          </div>

          {/* BANNER HORIZONTAL (CONTA INATIVA) */}
          {profile?.is_active === false && (
            <div style={{ 
              backgroundColor: 'var(--bg-card)', 
              border: '1px solid var(--border)',
              borderLeft: '4px solid var(--primary)',
              borderRadius: '12px',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1.25rem',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>Sua conta está inativa</h4>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    Para liberar o acesso completo ao Plano do Curso, entre em contato com a Melissa pelo WhatsApp.
                  </p>
                </div>
              </div>
              <a 
                href="https://wa.me/5547997710603" 
                target="_blank" 
                className="btn-primary"
                style={{ padding: '0.6rem 1.25rem', fontSize: '0.875rem', borderRadius: '8px', fontWeight: 600 }}
              >
                Falar com Melissa
              </a>
            </div>
          )}
        </div>

        {/* GRID PRINCIPAL 70/30 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>
          
          {/* COLUNA ESQUERDA: PRÓXIMOS EVENTOS (70%) */}
          <div style={{ gridColumn: 'span 12', lg: 'span 8' } as any}>
            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)' }}>Aulas Abertas Disponíveis</h3>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {availableEvents.length} eventos encontrados
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {availableEvents.length === 0 ? (
                  <div style={{ padding: '4rem 2rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Nenhum novo evento disponível no momento.</p>
                  </div>
                ) : (
                  availableEvents.map((event: any) => (
                    <EventCard 
                      key={event.id}
                      event={event}
                      userTimezone={profile?.timezone || 'America/Sao_Paulo'}
                      isStudent={true}
                      isStaff={false}
                      meetLink={undefined}
                    />
                  ))
                )}
              </div>
            </section>
          </div>

          {/* COLUNA DIREITA: MINHAS INSCRIÇÕES & INFO (30%) */}
          <div style={{ gridColumn: 'span 12', lg: 'span 4' } as any}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Minhas Inscrições */}
              <section style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem' }}>Minhas Inscrições</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {enrolledEvents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                      <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Nenhuma inscrição realizada até o momento.</p>
                    </div>
                  ) : (
                    enrolledEvents.map((event: any) => (
                      <div key={event.id} style={{ padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-main)' }}>
                        <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', fontWeight: 600 }}>{event.title}</h4>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>
                          Status: <span style={{ color: 'var(--success)', fontWeight: 600 }}>Inscrito</span>
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Plano do Curso (SaaS Style) */}
              <section style={{ padding: '1rem' }}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                  Acesso Completo
                </h4>
                <ul style={{ padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[
                    { text: 'Aulas individuais semanais' },
                    { text: 'Agenda flexível de horários' },
                    { text: 'Acesso ao material didático' },
                    { text: 'Participação na comunidade' }
                  ].map((b, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', color: '#4b5563' }}>
                      <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
                      {b.text}
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: '1.5rem' }}>
                  <a href="https://wa.me/5547997710603" target="_blank" style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                    Ativar meu Plano →
                  </a>
                </div>
              </section>

            </div>
          </div>

        </div>
      </main>

      {/* FOOTER SaaS */}
      <footer style={{ 
        marginTop: '4rem', 
        padding: '2rem', 
        borderTop: '1px solid #e5e7eb',
        textAlign: 'center',
        color: '#9ca3af',
        fontSize: '0.8rem'
      }}>
        <p>© {new Date().getFullYear()} EdAcademy. Todos os direitos reservados.</p>
      </footer>

      {/* Estilos inline para ajuste de Grid Responsivo (Simulação de Media Query via CSS inline é limitada, mas o grid-column: span 12 ajuda) */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 1024px) {
          main { padding: 1.5rem 1rem !important; }
          .grid-container { grid-template-columns: 1fr !important; }
        }
      `}} />
    </div>
  )
}
