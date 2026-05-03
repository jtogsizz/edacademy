import { createClient } from '@/utils/supabase/server'
import PublicEventsClient from './PublicEventsClient'

export default async function PublicEventsSection() {
  const supabase = await createClient()

  // Verifica se há usuário logado
  const { data: { user } } = await supabase.auth.getUser()
  const isLogged = !!user

  // Busca eventos públicos via RPC
  const { data: events, error } = await supabase.rpc('get_public_events')

  if (error) {
    console.error('Erro ao buscar eventos públicos:', error)
    return null
  }

  // Se não houver eventos, não renderiza a seção
  if (!events || events.length === 0) {
    return (
      <div style={{ padding: '10rem 1.5rem', textAlign: 'center', backgroundColor: '#FFFFFF' }}>
          <h2 style={{ 
            fontSize: 'clamp(2.5rem, 6vw, 3.5rem)', 
            fontWeight: 900, 
            marginBottom: '2rem',
            letterSpacing: '-0.04em',
            color: '#0f0f0f'
          }}>
            Eventos <span style={{ color: 'var(--primary)' }}>Gratuitos</span> e Aulas Ao Vivo
          </h2>
        <p style={{ color: '#9CA3AF', fontSize: '1.2rem' }}>Nenhum evento disponível no momento. Volte em breve!</p>
      </div>
    )
  }

  return <PublicEventsClient initialEvents={events} isLogged={isLogged} />
}
