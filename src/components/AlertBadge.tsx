
type AlertType = 'warning' | 'error' | 'success' | 'info' | 'neutral'

interface AlertBadgeProps {
  type?: AlertType
  message: string
  count?: number
  icon?: string
}

/**
 * Badge de alerta operacional para o painel financeiro/admin.
 */
export default function AlertBadge({ type = 'warning', message, count, icon }: AlertBadgeProps) {
  const typeClass: Record<AlertType, string> = {
    warning: 'alert-badge-warning',
    error:   'alert-badge-error',
    success: 'alert-badge-success',
    info:    'alert-badge-info',
    neutral: 'alert-badge-neutral',
  }

  const defaultIcon: Record<AlertType, string> = {
    warning: '⚠',
    error:   '●',
    success: '✓',
    info:    'ℹ',
    neutral: '–',
  }

  return (
    <span className={`alert-badge ${typeClass[type]}`}>
      <span>{icon ?? defaultIcon[type]}</span>
      {message}
      {count !== undefined && (
        <span style={{
          marginLeft: '0.25rem',
          background: 'rgba(0,0,0,0.1)',
          borderRadius: '99px',
          padding: '0 0.35rem',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {count}
        </span>
      )}
    </span>
  )
}
