/**
 * Hook de tradução — sem lib externa
 *
 * Uso em Client Components:
 *   const t = useTranslation()
 *   <span>{t.nav.home}</span>
 */
import { useLocale } from '@/contexts/LocaleContext'
import { pt } from './dictionaries/pt'
import { en } from './dictionaries/en'
import { es } from './dictionaries/es'

export type { Locale } from '@/contexts/LocaleContext'
export type { Dictionary } from './dictionaries/pt'

const dicts = { pt, en, es }

export function useTranslation() {
  const { locale } = useLocale()
  return dicts[locale]
}
