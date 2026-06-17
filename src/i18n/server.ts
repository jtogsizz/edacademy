import { cookies } from 'next/headers'
import { pt } from './dictionaries/pt'
import { en } from './dictionaries/en'
import { es } from './dictionaries/es'
import type { Locale } from '@/contexts/LocaleContext'

const dicts = { pt, en, es }

/**
 * Função para buscar traduções em Server Components.
 * Lê o cookie 'edacademy_locale'.
 */
export async function getTranslation() {
  const cookieStore = await cookies()
  const localeValue = cookieStore.get('edacademy_locale')?.value as Locale
  const locale: Locale = localeValue && ['pt', 'en', 'es'].includes(localeValue) ? localeValue : 'pt'
  return dicts[locale]
}
