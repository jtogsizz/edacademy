import BottomNav from "@/components/BottomNav";
import { createClient } from '@/utils/supabase/server'
import TimezoneDetector from '@/components/TimezoneDetector'
import PreferencesLoader from '@/components/PreferencesLoader'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient()

  // Verifica se existe sessão
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verifica se é admiń
  const { data: profile } = await supabase.from('profiles').select('role, is_active, whatsapp_number, ui_theme, ui_locale').eq('id', user.id).single()

  if (profile && !profile.whatsapp_number) {
    redirect('/onboarding')
  }

  if (profile && profile.is_active === false) {
    // Redireciona mesmo o admin se estiver inativo, como garantia
    redirect('/meus-eventos')
  }

  if (profile?.role !== 'admin' && profile?.role !== 'admin_master' && profile?.role !== 'suporte' && profile?.role !== 'dev') {
    // Se não for nenhum tipo de admin, chuta de volta pro dashboard do aluno
    redirect('/dashboard')
  }

  return (
    <div className="app-shell">
      <PreferencesLoader initialTheme={profile?.ui_theme} initialLocale={profile?.ui_locale} />
      <TimezoneDetector />
      {children}
      <BottomNav role={profile?.role || 'admin'} />
    </div>
  );
}
