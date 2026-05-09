/**
 * Tabela de preços dos planos EdAcademy.
 * ⚠️ Altere os valores aqui para refletir mudanças de preço.
 * Este é o único arquivo responsável por definir preços no sistema.
 */
export const PLAN_PRICES: Record<string, number> = {
  mensal:      197,
  trimestral:  497,
  semestral:   897,
  anual:       1497,
}

/**
 * Calcula a receita estimada mensal de uma lista de assinaturas ativas.
 * Para planos multi-mês, divide o valor pelo número de meses.
 */
export function calcMonthlyRevenue(subscriptions: { plan_type: string | null; status: string }[]): number {
  const MONTHS: Record<string, number> = {
    mensal:     1,
    trimestral: 3,
    semestral:  6,
    anual:      12,
  }

  return subscriptions
    .filter(s => s.status === 'active')
    .reduce((total, s) => {
      const plan = s.plan_type || 'mensal'
      const price = PLAN_PRICES[plan] ?? PLAN_PRICES.mensal
      const months = MONTHS[plan] ?? 1
      return total + price / months
    }, 0)
}

/**
 * Formata um valor monetário em Real Brasileiro.
 */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}
