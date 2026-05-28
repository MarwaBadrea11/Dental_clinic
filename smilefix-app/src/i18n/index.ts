import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en/translation.json'
import ar from './locales/ar/translation.json'

const LANG_KEY = 'smilefix-language'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    // Read from localStorage first, fall back to 'en'
    lng: (() => {
      try { return localStorage.getItem(LANG_KEY) ?? 'en' } catch { return 'en' }
    })(),
    fallbackLng: 'en',
    supportedLngs: ['en', 'ar'],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      // We manage language ourselves via localStorage
      order: [],
    },
  })

export default i18n

/** Apply language to DOM: sets dir + lang attributes and persists to localStorage */
export function applyLanguage(lang: 'en' | 'ar') {
  const isRTL = lang === 'ar'
  document.documentElement.setAttribute('lang', lang)
  document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr')
  try { localStorage.setItem(LANG_KEY, lang) } catch { /* ignore */ }
  i18n.changeLanguage(lang)
}

/** Read persisted language without initializing i18n */
export function getStoredLanguage(): 'en' | 'ar' {
  try {
    const stored = localStorage.getItem(LANG_KEY)
    return stored === 'ar' ? 'ar' : 'en'
  } catch {
    return 'en'
  }
}
