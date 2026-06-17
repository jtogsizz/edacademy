'use client'

import { useTheme } from '@/contexts/ThemeContext'
import { useLocale, type Locale } from '@/contexts/LocaleContext'
import { useTranslation } from '@/i18n'
import { startTransition } from 'react'
import { saveUserPreferences } from '@/app/dashboard/actions'

export default function PreferencesToggle() {
  const { theme, toggle } = useTheme()
  const { locale, setLocale } = useLocale()
  const t = useTranslation()

  const locales: { value: Locale; label: string }[] = [
    { value: 'pt', label: t.preferences.langPt },
    { value: 'en', label: t.preferences.langEn },
    { value: 'es', label: t.preferences.langEs },
  ]

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-main)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {t.preferences.title}
      </div>

      {/* ── Tema ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
          {t.preferences.theme}
        </span>

        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '99px',
            padding: '0.2rem',
            gap: '0.2rem',
          }}
        >
          {(['light', 'dark'] as const).map((mode) => {
            const isActive = theme === mode
            const label = mode === 'light' ? t.preferences.themeLight : t.preferences.themeDark
            const icon = mode === 'light' ? '☀️' : '🌙'
            return (
              <button
                key={mode}
                onClick={() => {
                  if (theme !== mode) {
                    toggle()
                    startTransition(() => {
                      saveUserPreferences(mode, locale)
                    })
                  }
                }}
                style={{
                  padding: '0.35rem 0.85rem',
                  borderRadius: '99px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#fff' : 'var(--text-muted)',
                  background: isActive ? 'var(--primary-gradient)' : 'transparent',
                  boxShadow: isActive ? '0 2px 8px rgba(234,88,12,0.25)' : 'none',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <span style={{ fontSize: '0.9rem' }}>{icon}</span>
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Idioma ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
          {t.preferences.language}
        </span>

        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '99px',
            padding: '0.2rem',
            gap: '0.2rem',
          }}
        >
          {locales.map(({ value, label }) => {
            const isActive = locale === value
            return (
              <button
                key={value}
                onClick={() => {
                  if (locale !== value) {
                    setLocale(value)
                    startTransition(() => {
                      saveUserPreferences(theme, value)
                    })
                  }
                }}
                style={{
                  padding: '0.35rem 0.85rem',
                  borderRadius: '99px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#fff' : 'var(--text-muted)',
                  background: isActive ? 'var(--primary-gradient)' : 'transparent',
                  boxShadow: isActive ? '0 2px 8px rgba(234,88,12,0.25)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
