/**
 * Utilitário central de roles para EdAcademy.
 * Toda verificação de permissão deve usar estas funções/constantes.
 */

export type AppRole = 'student' | 'admin' | 'admin_master' | 'suporte' | 'dev'

/** Roles que têm acesso ao painel /admin */
export const ADMIN_ROLES: AppRole[] = ['admin', 'admin_master', 'suporte', 'dev']

/** Roles que são professores (aparecem nas queries de agendamento) */
export const TEACHER_ROLES: AppRole[] = ['admin', 'admin_master']

/** Roles com poderes de nível master (ações privilegiadas) */
export const MASTER_ROLES: AppRole[] = ['admin_master', 'dev']

/** Verifica se um role tem acesso ao painel admin */
export function isAdminRole(role?: string | null): boolean {
  return ADMIN_ROLES.includes(role as AppRole)
}

/** Verifica se um role é professor (aparece na agenda) */
export function isTeacherRole(role?: string | null): boolean {
  return TEACHER_ROLES.includes(role as AppRole)
}

/** Verifica se um role tem poderes de master (admin_master ou dev) */
export function isMasterRole(role?: string | null): boolean {
  return MASTER_ROLES.includes(role as AppRole)
}

/** Verifica se o role é dev (nível máximo) */
export function isDevRole(role?: string | null): boolean {
  return role === 'dev'
}

/**
 * Retorna os roles para os quais um executor pode promover outro usuário.
 * Reflete as regras do RPC promote_user_role() no banco.
 */
export function allowedTargetRoles(executorRole?: string | null): AppRole[] {
  if (executorRole === 'dev') {
    return ['student', 'admin', 'admin_master', 'suporte', 'dev']
  }
  if (executorRole === 'admin_master') {
    return ['student', 'admin', 'suporte']
  }
  return []
}

/** Labels de exibição para cada role */
export const ROLE_LABELS: Record<AppRole, string> = {
  student:      'Aluno',
  admin:        'Professor',
  admin_master: 'Admin Master',
  suporte:      'Suporte',
  dev:          'Dev',
}

/** Cor de badge para cada role */
export const ROLE_BADGE_STYLE: Record<AppRole, { bg: string; color: string; border: string }> = {
  student:      { bg: 'rgba(99,102,241,0.1)',  color: '#4f46e5', border: 'rgba(99,102,241,0.2)' },
  admin:        { bg: 'rgba(16,185,129,0.1)',  color: '#059669', border: 'rgba(16,185,129,0.2)' },
  admin_master: { bg: 'rgba(234,88,12,0.1)',   color: '#ea580c', border: 'rgba(234,88,12,0.25)' },
  suporte:      { bg: 'rgba(59,130,246,0.1)',  color: '#2563eb', border: 'rgba(59,130,246,0.2)' },
  dev:          { bg: 'rgba(168,85,247,0.1)',  color: '#7c3aed', border: 'rgba(168,85,247,0.25)' },
}
