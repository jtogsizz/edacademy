'use client'

import { useRouter, useSearchParams } from 'next/navigation'

type Teacher = { id: string; full_name: string }

export default function TeacherSelector({ teachers, selectedId }: { teachers: Teacher[]; selectedId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('teacher_id', e.target.value)
    router.push(`/admin/agenda?${params.toString()}`)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
      <label htmlFor="teacher-select" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
        Ver agenda de:
      </label>
      <select
        id="teacher-select"
        value={selectedId}
        onChange={handleChange}
        style={{
          padding: '0.5rem 1rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          backgroundColor: 'var(--bg-card)',
          color: 'var(--text-main)',
          fontSize: '0.9rem',
          fontWeight: 600,
          cursor: 'pointer',
          outline: 'none',
          minWidth: '200px'
        }}
      >
        {teachers.map(t => (
          <option key={t.id} value={t.id}>{t.full_name}</option>
        ))}
      </select>
    </div>
  )
}
