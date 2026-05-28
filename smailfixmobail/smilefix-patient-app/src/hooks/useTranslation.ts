// ─────────────────────────────────────────────
// useTranslation — wraps react-i18next
// Adds isRTL and locale helpers
// ─────────────────────────────────────────────
import { useTranslation as useI18nTranslation } from 'react-i18next';
import { useAppStore } from '../store/appStore';
import type { TranslationKey } from '../i18n';

export function useTranslation() {
  const { t: rawT, i18n } = useI18nTranslation();
  const locale = useAppStore((s) => s.locale);
  const isRTL  = locale === 'ar';

  function t(key: TranslationKey): string {
    return rawT(key as string) as string;
  }

  return { t, locale, isRTL, i18n };
}
