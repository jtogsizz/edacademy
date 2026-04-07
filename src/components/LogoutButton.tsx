"use client"

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const supabase = createClient()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  return (
    <button onClick={handleLogout} className="btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
      Deslogar
    </button>
  )
}
