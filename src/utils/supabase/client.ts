import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Assegurando que as variáveis estão corretas sem undefined
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Erro Crítico: NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY não estão definidas.")
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
