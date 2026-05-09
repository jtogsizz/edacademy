
export interface TableColumn<T = any> {
  key: string
  label: string
  render?: (row: T) => React.ReactNode
  mobileHide?: boolean
}

interface DataTableProps<T = any> {
  title?: string
  columns: TableColumn<T>[]
  rows: T[]
  emptyIcon?: string
  emptyMessage?: string
  emptySubtext?: string
  count?: number
  actions?: React.ReactNode
  mobileCards?: boolean
}

/**
 * Tabela moderna reutilizável para o sistema interno EdAcademy.
 * Em mobile (≤640px), converte automaticamente em lista de cards
 * se `mobileCards` for true.
 */
export default function DataTable<T extends Record<string, any>>({
  title,
  columns,
  rows,
  emptyIcon = '📋',
  emptyMessage = 'Nenhum registro encontrado',
  emptySubtext,
  count,
  actions,
  mobileCards = true,
}: DataTableProps<T>) {
  const tableClass = `data-table${mobileCards ? ' data-table-mobile-cards' : ''}`

  return (
    <div className="data-table-wrap">
      {(title || actions) && (
        <div className="data-table-header">
          <div className="data-table-title">
            {title}
            {count !== undefined && (
              <span className="data-table-count">{count}</span>
            )}
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}

      <div className="data-table-scroll">
        {rows.length > 0 ? (
          <table className={tableClass}>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id ?? i}>
                  {columns.map((col) => (
                    <td key={col.key} data-label={col.label}>
                      {col.render ? col.render(row) : row[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="data-table-empty">
            <div className="data-table-empty-icon">{emptyIcon}</div>
            <div className="data-table-empty-msg">{emptyMessage}</div>
            {emptySubtext && (
              <p style={{ fontSize: '0.8rem', marginTop: '0.35rem', color: 'var(--text-muted)' }}>
                {emptySubtext}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
