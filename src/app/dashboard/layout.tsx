import BottomNav from "@/components/BottomNav";
import { createClient } from '@/utils/supabase/server'
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

  // Verifica se é admiń, se for ele não devia estar no dashboard de aluno
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role === 'admin' || profile?.role === 'admin_master') {
    redirect('/admin')
  }

  return (
    <div>
      {children}
      <BottomNav role="student" />
    </div>
  );
}
