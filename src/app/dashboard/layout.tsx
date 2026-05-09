import BottomNav from "@/components/BottomNav";
import { createClient } from '@/utils/supabase/server'
import TimezoneDetector from '@/components/TimezoneDetector'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient()

  // Verifica se existe sessão ativa
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verifica se a conta está sem whatsapp (perfil incompleto)
  // E também verifica se a conta está inativa
  const { data: profile } = await supabase.from('profiles').select('role, is_active, whatsapp_number').eq('id', user.id).single()
  
  if (profile && !profile.whatsapp_number) {
    redirect('/onboarding')
  }

  if (profile && profile.is_active === false) {
    redirect('/meus-eventos')
  }


  return (
    <div>
      <TimezoneDetector />
      {children}
      <BottomNav role={profile?.role || 'student'} />
    </div>
  );
}
