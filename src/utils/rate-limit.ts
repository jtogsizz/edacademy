/**
 * EdAcademy — Rate Limiting com Upstash Redis
 *
 * Estratégia: Sliding Window (janela deslizante)
 * - Mais justo que Fixed Window: evita burst no início de cada janela
 * - Upstash Redis compartilha estado entre múltiplas instâncias Vercel
 *
 * Variáveis de ambiente necessárias:
 *   UPSTASH_REDIS_REST_URL=https://...
 *   UPSTASH_REDIS_REST_TOKEN=...
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ─── Cliente Redis ──────────────────────────────────────────
// Em desenvolvimento sem Redis configurado, a lib vai lançar exceção.
// O fallback abaixo garante que o app não quebre em dev local.
let redis: Redis | null = null

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
} catch {
  console.warn('[RateLimit] Redis não configurado. Rate limiting desabilitado.')
}

// ─── Criação de Limiters ────────────────────────────────────
function createLimiter(requests: number, windowSeconds: number) {
  if (!redis) return null
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, `${windowSeconds} s`),
    analytics: false,
  })
}

/**
 * Limiters por categoria de ação.
 * Chave: string identificando o contexto (userId ou IP).
 *
 * Limites finais aprovados:
 *   - auth (cadastro/login):  5 tentativas / 10 min (por IP)
 *   - post:                  10 posts      / 1 min  (por userId)
 *   - comment:               20 comentários/ 1 min  (por userId)
 *   - chat:                  60 mensagens  / 1 min  (por userId)
 *   - book_slot:              5 agendamentos/ 5 min  (por userId)
 *   - join_event:            10 inscrições / 10 min (por userId)
 */
const limiters = {
  auth:       createLimiter(5,  10 * 60),
  post:       createLimiter(10, 60),
  comment:    createLimiter(20, 60),
  chat:       createLimiter(60, 60),
  book_slot:  createLimiter(5,  5 * 60),
  join_event: createLimiter(10, 10 * 60),
} as const

export type RateLimitKey = keyof typeof limiters

/**
 * Verifica se o identificador ultrapassou o limite para o tipo de ação.
 *
 * @param type     Categoria do limite (ex: 'post', 'chat')
 * @param identity Identificador único — userId para ações autenticadas, IP para auth
 * @returns `{ limited: true }` se o limite foi atingido, `{ limited: false }` caso contrário
 *
 * @example
 * const { limited } = await checkRateLimit('chat', user.id)
 * if (limited) return { error: 'Muitas mensagens. Aguarde alguns segundos.' }
 */
export async function checkRateLimit(
  type: RateLimitKey,
  identity: string
): Promise<{ limited: boolean; remaining?: number; reset?: number }> {
  const limiter = limiters[type]

  // Redis não configurado → permite tudo (modo dev sem Redis)
  if (!limiter) {
    return { limited: false }
  }

  try {
    const { success, remaining, reset } = await limiter.limit(`rl:${type}:${identity}`)
    return { limited: !success, remaining, reset }
  } catch (err) {
    // Falha de conexão com Redis → fail-open (não bloqueia o usuário real)
    console.error('[RateLimit] Erro ao verificar limite:', err)
    return { limited: false }
  }
}

/**
 * Mensagens de erro padrão por categoria.
 */
export const RATE_LIMIT_MESSAGES: Record<RateLimitKey, string> = {
  auth:       'Muitas tentativas de acesso. Aguarde 10 minutos antes de tentar novamente.',
  post:       'Você está publicando rápido demais. Aguarde 1 minuto.',
  comment:    'Muitos comentários em pouco tempo. Aguarde 1 minuto.',
  chat:       'Muitas mensagens enviadas. Aguarde alguns segundos.',
  book_slot:  'Muitas tentativas de agendamento. Aguarde 5 minutos.',
  join_event: 'Muitas inscrições em eventos. Aguarde 10 minutos.',
}
