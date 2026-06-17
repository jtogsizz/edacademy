'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggle: () => void
  setThemeOverride: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggle: () => {},
  setThemeOverride: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Inicializa com 'light' — SSR-safe (sem acesso a localStorage no servidor)
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    // Lê o que o ThemeScript já aplicou no <html>
    const applied = document.documentElement.classList.contains('theme-dark') ? 'dark' : 'light'
    setTheme(applied)
  }, [])

  const toggle = () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    // Aplica no <html> para o ThemeScript e CSS reagirem
    document.documentElement.classList.remove('theme-light', 'theme-dark')
    document.documentElement.classList.add('theme-' + next)
    // Persiste
    try {
      localStorage.setItem('edacademy_theme', next)
    } catch {}
    setTheme(next)
  }

  const setThemeOverride = (t: Theme) => {
    document.documentElement.classList.remove('theme-light', 'theme-dark')
    document.documentElement.classList.add('theme-' + t)
    try {
      localStorage.setItem('edacademy_theme', t)
    } catch {}
    setTheme(t)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle, setThemeOverride }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
