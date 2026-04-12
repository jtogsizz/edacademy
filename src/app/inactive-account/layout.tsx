import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function InactiveAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient()

  // Verifica se existe sessão ativa
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verifica se o perfil está completo
  const { data: profile } = await supabase.from('profiles').select('whatsapp_number').eq('id', user.id).single()
  
  if (profile && !profile.whatsapp_number) {
    redirect('/onboarding')
  }

  return (
    <div>
      {children}
    </div>
  );
}
