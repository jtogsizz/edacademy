'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { useLocale, type Locale } from '@/contexts/LocaleContext'

interface PreferencesLoaderProps {
  initialTheme?: string | null
  initialLocale?: string | null
}

export default function PreferencesLoader({ initialTheme, initialLocale }: PreferencesLoaderProps) {
  const { theme, setThemeOverride } = useTheme()
  const { locale, setLocale } = useLocale()
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true

    let nextLocale = locale
    let nextTheme = theme

    // Se o banco tem uma preferência, usa ela e sobrepõe o localStorage
    if (initialLocale && ['pt', 'en', 'es'].includes(initialLocale) && initialLocale !== locale) {
      nextLocale = initialLocale as Locale
      setLocale(nextLocale)
    }

    if (initialTheme && ['light', 'dark'].includes(initialTheme) && initialTheme !== theme) {
      nextTheme = initialTheme as 'light' | 'dark'
      setThemeOverride(nextTheme)
    }

    // Sempre garante que o cookie e localStorage estão alinhados com a preferência atual ou do banco
    try {
      document.cookie = `edacademy_locale=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`
      localStorage.setItem('edacademy_locale', nextLocale)
      localStorage.setItem('edacademy_theme', nextTheme)
    } catch {}

  }, [initialLocale, initialTheme, locale, setLocale, theme, setThemeOverride])

  return null
}
