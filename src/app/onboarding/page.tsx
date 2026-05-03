import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingForm from './OnboardingForm'
import Logo from '@/components/Logo'

export default async function OnboardingPage() {
  const supabase = await createClient()

  // Verifica se existe sessão ativa
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verifica se o perfil JÁ TEM whatsapp, se tiver, foge daqui
  const { data: profile } = await supabase.from('profiles').select('full_name, whatsapp_number, is_active').eq('id', user.id).single()
  
  if (profile?.whatsapp_number) {
    if (profile.is_active) {
       redirect('/dashboard')
    } else {
       redirect('/meus-eventos')
    }
  }

  // Prepara dados iniciais puxados do google se houver
  const initialName = profile?.full_name || ''

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <Logo />
        </div>
        <h2 style={{ textAlign: 'center', marginBottom: '1rem', fontSize: '1.25rem' }}>Quase lá!</h2>
        
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
          Complete seu perfil para enviar sua conta para aprovação.
        </p>

        <OnboardingForm initialName={initialName} />

      </div>
    </div>
  )
}
