import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import { cookies } from 'next/headers'
import AdminDashboardView from './AdminDashboardView'
import StudentDashboardView from './StudentDashboardView'

export const metadata = { title: 'Início · EdAcademy' }

export default async function DashboardPage() {
  noStore()
  const supabase = await createClient()
  const cookieStore = await cookies()
  const clientTz = cookieStore.get('client_tz')?.value

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const isAdminRole = ['admin', 'admin_master', 'suporte', 'dev'].includes(profile?.role)

  if (isAdminRole) {
    return <AdminDashboardView user={user} profile={profile} clientTz={clientTz} />
  }

  return <StudentDashboardView user={user} profile={profile} clientTz={clientTz} />
}
