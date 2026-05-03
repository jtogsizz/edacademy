import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getAppUrl } from '@/utils/url'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const origin = getAppUrl()
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && session?.user) {
      // White-list check via profiles table using the user's email instead of ID
      // This prevents any mismatch edge cases if an ID gets out of sync
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_active, whatsapp_number')
        .eq('email', session.user.email)
        .single()

      if (!profile?.whatsapp_number) {
        // Redireciona para onboarding se o perfil estiver incompleto
        return NextResponse.redirect(`${origin}/onboarding`)
      }

      if (profile?.is_active) {
        return NextResponse.redirect(`${origin}${next}`)
      } else {
        // Redireciona para conta inativa
        return NextResponse.redirect(`${origin}/meus-eventos`)
      }
    }
  }

  // Falha silenciosa ou erro de código
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
