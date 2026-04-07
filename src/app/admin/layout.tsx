import BottomNav from "@/components/BottomNav";
import { createClient } from '@/utils/supabase/server'
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
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'admin_master') {
    // Se não for admin, chuta de volta pro dashboard do aluno
    redirect('/dashboard')
  }

  return (
    <div>
      {children}
      <BottomNav role="admin" />
    </div>
  );
}
