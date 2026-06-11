import type { TFunction } from 'i18next'
import type { TreatmentCategory } from '@/types'

export const TREATMENT_CATEGORIES: TreatmentCategory[] = [
  'Preventive',
  'Restorative',
  'Endodontic',
  'Periodontic',
  'Prosthodontic',
  'Orthodontic',
  'Oral Surgery',
  'Cosmetic',
]

/** Maps backend category enum values to i18n key paths under `treatments.*`. */
export const treatmentCategoryKey: Record<TreatmentCategory, string> = {
  Preventive:    'treatments.cat_Preventive',
  Restorative:   'treatments.cat_Restorative',
  Endodontic:    'treatments.cat_Endodontic',
  Periodontic:   'treatments.cat_Periodontic',
  Prosthodontic: 'treatments.cat_Prosthodontic',
  Orthodontic:   'treatments.cat_Orthodontic',
  'Oral Surgery':'treatments.cat_OralSurgery',
  Cosmetic:      'treatments.cat_Cosmetic',
}

function resolveCategoryKey(category: string): string | undefined {
  if (!category) return undefined
  const direct = treatmentCategoryKey[category as TreatmentCategory]
  if (direct) return direct
  // Normalise common API variants (e.g. "Periodontal" → Periodontic)
  const normalised = category.trim()
  const match = TREATMENT_CATEGORIES.find(
    (c) => c.toLowerCase() === normalised.toLowerCase(),
  )
  return match ? treatmentCategoryKey[match] : undefined
}

export function getTreatmentCategoryLabel(t: TFunction, category: string | undefined | null) {
  if (!category) return '—'
  const key = resolveCategoryKey(category)
  if (!key || typeof t !== 'function') return category
  const translated = t(key)
  return translated === key ? category : translated
}

export function buildTreatmentCategorySelectOptions(
  t: TFunction,
  { includeAll = false }: { includeAll?: boolean } = {},
) {
  if (typeof t !== 'function') {
    return includeAll ? [{ value: 'all', label: 'All Categories' }] : []
  }

  const categoryOptions = TREATMENT_CATEGORIES.map((category) => {
    const key = treatmentCategoryKey[category]
    return {
      value: category,
      label: key ? t(key) : category,
    }
  })

  return includeAll
    ? [{ value: 'all', label: t('treatments.allCategories') }, ...categoryOptions]
    : categoryOptions
}

/** Merge known categories with any extra values returned by the API. */
export function buildTreatmentCategorySelectOptionsWithApiValues(
  t: TFunction,
  apiCategories: string[] = [],
  { includeAll = false }: { includeAll?: boolean } = {},
) {
  const base = buildTreatmentCategorySelectOptions(t, { includeAll })
  const knownValues = new Set(TREATMENT_CATEGORIES)

  const extras = apiCategories
    .filter((cat): cat is string => Boolean(cat) && !knownValues.has(cat as TreatmentCategory))
    .map((cat) => ({
      value: cat,
      label: getTreatmentCategoryLabel(t, cat),
    }))

  if (!extras.length) return base

  const allOption = includeAll ? base.slice(0, 1) : []
  const knownOptions = includeAll ? base.slice(1) : base
  return [...allOption, ...knownOptions, ...extras]
}

export function isKnownTreatmentCategory(category: string): category is TreatmentCategory {
  return TREATMENT_CATEGORIES.includes(category as TreatmentCategory)
}
