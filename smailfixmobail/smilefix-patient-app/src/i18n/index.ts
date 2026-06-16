// ─────────────────────────────────────────────
// i18n — react-i18next + i18next
// Supports Arabic (RTL) and English (LTR)
// ─────────────────────────────────────────────
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './ar';
import en from './en';

export type Locale = 'ar' | 'en';
export type TranslationKey = keyof typeof ar;

// Default to Arabic. The App component sets I18nManager.forceRTL
// after the React Native bridge is ready (inside useLayoutEffect).
i18n
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: ar },
      en: { translation: en },
    },
    lng:           'ar',
    fallbackLng:   'ar',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  });

export default i18n;
export { ar, en };
