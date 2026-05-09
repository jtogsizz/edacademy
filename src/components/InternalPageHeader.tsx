import React from 'react'
import Link from 'next/link'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface InternalPageHeaderProps {
  title: string
  subtitle?: string
  breadcrumb?: BreadcrumbItem[]
  actions?: React.ReactNode
}

/**
 * Header padronizado para todas as páginas internas do EdAcademy.
 * Breadcrumb + título + subtítulo + ações opcionais.
 */
export default function InternalPageHeader({
  title,
  subtitle,
  breadcrumb,
  actions,
}: InternalPageHeaderProps) {
  return (
    <header className="internal-header">
      <div className="internal-header-left">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="internal-breadcrumb" aria-label="Breadcrumb">
            {breadcrumb.map((item, i) => (
              <React.Fragment key={i}>
                {i > 0 && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                )}
                {item.href ? (
                  <Link href={item.href}>{item.label}</Link>
                ) : (
                  <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{item.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <h1 className="internal-title">{title}</h1>
        {subtitle && <p className="internal-subtitle">{subtitle}</p>}
      </div>

      {actions && (
        <div className="internal-header-actions">
          {actions}
        </div>
      )}
    </header>
  )
}
