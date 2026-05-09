import Link from 'next/link'

interface StatCardProps {
  icon: React.ReactNode
  value: string | number
  label: string
  trend?: { label: string; direction: 'up' | 'down' | 'warn' }
  iconBg?: string
  iconColor?: string
  href?: string
  valueColor?: string
}

/**
 * Card de KPI reutilizável para painéis e dashboards internos.
 */
export default function StatCard({
  icon,
  value,
  label,
  trend,
  iconBg = 'var(--primary-light)',
  iconColor = 'var(--primary)',
  href,
  valueColor,
}: StatCardProps) {
  const content = (
    <>
      <div className="stat-card-icon" style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>
      <div className="stat-card-value" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </div>
      <div className="stat-card-label">{label}</div>
      {trend && (
        <div className={`stat-card-trend ${trend.direction}`}>
          {trend.direction === 'up'   && '↑'}
          {trend.direction === 'down' && '↓'}
          {trend.direction === 'warn' && '⚠'}
          {trend.label}
        </div>
      )}
    </>
  )

  if (href) {
    return (
      <Link href={href} className="stat-card" style={{ textDecoration: 'none' }}>
        {content}
      </Link>
    )
  }

  return <div className="stat-card">{content}</div>
}
