'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type Locale = 'pt' | 'en' | 'es'

interface LocaleContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'pt',
  setLocale: () => {},
})

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // 'pt' como padrão SSR-safe (maioria dos usuários é brasileira)
  const [locale, setLocaleState] = useState<Locale>('pt')

  useEffect(() => {
    try {
      const stored = localStorage.getItem('edacademy_locale') as Locale | null
      if (stored && ['pt', 'en', 'es'].includes(stored)) {
        setLocaleState(stored)
      }
    } catch {}
  }, [])

  const setLocale = (l: Locale) => {
    try {
      localStorage.setItem('edacademy_locale', l)
      document.cookie = `edacademy_locale=${l}; path=/; max-age=31536000; SameSite=Lax`
    } catch {}
    setLocaleState(l)
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}
