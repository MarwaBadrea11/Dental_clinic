// ─────────────────────────────────────────────
// i18n — react-i18next + i18next
// Supports Arabic (RTL) and English (LTR)
// ─────────────────────────────────────────────
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import ar from './ar';
import en from './en';

export type Locale = 'ar' | 'en';
export type TranslationKey = keyof typeof ar;

// ── Step 1: Read persisted locale synchronously ───────────────────────────
// SecureStore is async, but we can peek at the metro bundler env or default.
// The persisted locale is synced in App.tsx after hydration. For the very
// first render we rely on the default 'ar' and the RTL flag we set here.
const DEFAULT_LOCALE: Locale = 'ar';

// ── Step 2: Apply RTL at module load time — BEFORE the React tree mounts ─
// This is the only reliable place to set I18nManager on Android/iOS.
// Calling forceRTL inside useEffect/useLayoutEffect is too late.
const shouldBeRTL = DEFAULT_LOCALE === 'ar';
if (I18nManager.isRTL !== shouldBeRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(shouldBeRTL);
}

// ── Step 3: Init i18next ──────────────────────────────────────────────────
i18n
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: ar },
      en: { translation: en },
    },
    lng:           DEFAULT_LOCALE,
    fallbackLng:   'ar',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  });

export default i18n;
export { ar, en };
