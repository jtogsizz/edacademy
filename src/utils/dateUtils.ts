/**
 * Utilitários de data para o sistema de assinaturas EdAcademy.
 *
 * A renovação deve sempre usar meses calendário reais,
 * não períodos fixos de 30 dias.
 */

/**
 * Mapa de plan_type → número de meses a somar.
 */
const PLAN_MONTHS: Record<string, number> = {
  mensal:      1,
  trimestral:  3,
  semestral:   6,
  anual:       12,
}

/**
 * Soma N meses calendário a uma data, respeitando o comportamento
 * correto de final de mês.
 *
 * Exemplos:
 *   addMonths(new Date('2025-01-31'), 1) → 2025-02-28
 *   addMonths(new Date('2024-01-31'), 1) → 2024-02-29  (ano bissexto)
 *   addMonths(new Date('2025-11-30'), 1) → 2025-12-30
 *   addMonths(new Date('2025-01-01'), 1) → 2025-02-01
 *
 * Estratégia:
 *   - Salva o dia original (ex: 31)
 *   - Seta o dia para 1 antes de somar, evitando overflow automático do JS
 *   - Soma os meses
 *   - Tenta restaurar o dia original; se exceder o último dia do mês
 *     resultante, usa o último dia disponível
 */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  const originalDay = result.getDate()

  // Reseta para o 1º do mês para evitar overflow no setMonth
  result.setDate(1)
  result.setMonth(result.getMonth() + months)

  // Determina o último dia do mês resultante
  const lastDayOfMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()

  // Restaura o dia original, limitado ao último dia do mês
  result.setDate(Math.min(originalDay, lastDayOfMonth))

  return result
}

/**
 * Calcula a nova data de vencimento somando 1 período completo
 * conforme o tipo do plano.
 *
 * @param baseDate  Data de referência (end_date atual se válida, ou hoje se vencida)
 * @param planType  Tipo do plano: 'mensal' | 'trimestral' | 'semestral' | 'anual'
 * @returns         Nova data de vencimento
 *
 * Exemplos:
 *   addPlanPeriod(new Date('2025-01-31'), 'mensal')     → 2025-02-28
 *   addPlanPeriod(new Date('2025-11-30'), 'mensal')     → 2025-12-30
 *   addPlanPeriod(new Date('2025-03-15'), 'trimestral') → 2025-06-15
 *   addPlanPeriod(new Date('2025-08-01'), 'semestral')  → 2026-02-01
 *   addPlanPeriod(new Date('2025-01-01'), 'anual')      → 2026-01-01
 */
export function addPlanPeriod(baseDate: Date, planType: string): Date {
  const months = PLAN_MONTHS[planType] ?? PLAN_MONTHS.mensal
  return addMonths(baseDate, months)
}
