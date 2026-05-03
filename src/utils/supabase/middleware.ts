import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { checkRateLimit, RATE_LIMIT_MESSAGES } from '@/utils/rate-limit'

// Rotas que precisam de rate limit por IP (pré-autenticação)
const AUTH_RATE_LIMITED_PATHS = ['/auth/callback', '/register']

export async function updateSession(request: NextRequest) {
  // ─── Rate Limit por IP em rotas de autenticação ───────────
  const pathname = request.nextUrl.pathname
  const isAuthRoute = AUTH_RATE_LIMITED_PATHS.some(p => pathname.startsWith(p))

  if (isAuthRoute) {
    // x-forwarded-for é o IP real no Vercel/proxies; fallback para 'unknown'
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'

    const { limited } = await checkRateLimit('auth', ip)

    if (limited) {
      return NextResponse.json(
        { error: RATE_LIMIT_MESSAGES.auth },
        { status: 429, headers: { 'Retry-After': '600' } }
      )
    }
  }

  // ─── Sessão Supabase ──────────────────────────────────────
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && (request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/admin'))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
