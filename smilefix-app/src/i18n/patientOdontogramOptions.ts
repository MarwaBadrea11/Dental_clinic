import type { TFunction } from 'i18next'
import type { ToothCondition, ToothSurface } from '@/types'

// ── Tooth conditions ──────────────────────────────────────────────────────────

export const TOOTH_CONDITIONS: ToothCondition[] = [
  'healthy',
  'caries',
  'filled',
  'crown',
  'root-canal',
  'missing',
  'extraction',
  'implant',
  'bridge',
  'fracture',
]

export const toothConditionKey: Record<ToothCondition, string> = {
  healthy:     'odontogram.healthy',
  caries:      'odontogram.caries',
  filled:      'odontogram.filled',
  crown:       'odontogram.crown',
  'root-canal':'odontogram.rootCanal',
  missing:     'odontogram.missing',
  extraction:  'odontogram.extraction',
  implant:     'odontogram.implant',
  bridge:      'odontogram.bridge',
  fracture:    'odontogram.fracture',
}

const toothConditionIcon: Partial<Record<ToothCondition, string>> = {
  healthy:    '✓',
  caries:     '●',
  filled:     '■',
  crown:      '♛',
  'root-canal':'|',
  missing:    '✕',
  extraction: '✕',
  implant:    '⊕',
  bridge:     '⌒',
  fracture:   '⚡',
}

export const LEGEND_CONDITIONS: ToothCondition[] = [
  'healthy',
  'caries',
  'filled',
  'crown',
  'root-canal',
  'missing',
  'implant',
]

export const legendColors: Record<ToothCondition, string> = {
  healthy:     '#ffffff',
  caries:      '#ffdad6',
  filled:      '#b6eadd',
  crown:       '#c7e7ff',
  'root-canal':'#fde8d8',
  missing:     '#e5e9ec',
  implant:     '#e8d5ff',
  bridge:      '#fef3c7',
  extraction:  '#e5e9ec',
  fracture:    '#fef9c3',
}

export function getToothConditionLabel(t: TFunction, condition: ToothCondition, short = false) {
  if (short && condition === 'root-canal') return t('odontogram.rootCanalShort')
  return t(toothConditionKey[condition])
}

export function buildToothConditionSelectOptions(t: TFunction) {
  return TOOTH_CONDITIONS.map((condition) => {
    const icon = toothConditionIcon[condition]
    const label = getToothConditionLabel(t, condition)
    return {
      value: condition,
      label: icon ? `${icon} ${label}` : label,
    }
  })
}

export function buildToothLegendItems(t: TFunction) {
  return LEGEND_CONDITIONS.map((condition) => ({
    condition,
    label: getToothConditionLabel(t, condition, condition === 'root-canal'),
    color: legendColors[condition],
  }))
}

// ── Quadrants & surfaces ──────────────────────────────────────────────────────

export type OdontogramQuadrant = 'upperRight' | 'upperLeft' | 'lowerRight' | 'lowerLeft'

export function getQuadrantLabel(t: TFunction, quadrant: OdontogramQuadrant) {
  return t(`odontogram.${quadrant}`)
}

export const toothSurfaceKey: Record<ToothSurface, string> = {
  mesial:   'odontogram.surface.mesial',
  distal:   'odontogram.surface.distal',
  occlusal: 'odontogram.surface.occlusal',
  buccal:   'odontogram.surface.buccal',
  lingual:  'odontogram.surface.lingual',
  root:     'odontogram.surface.root',
}

export function getToothSurfaceLabel(t: TFunction, surface: ToothSurface) {
  return t(toothSurfaceKey[surface])
}

// ── Patient form options ──────────────────────────────────────────────────────

export type PatientGender = 'male' | 'female' | 'other'

export const GENDERS: PatientGender[] = ['male', 'female', 'other']

export function buildGenderSelectOptions(t: TFunction) {
  return GENDERS.map((gender) => ({
    value: gender,
    label: t(`patients.${gender}`),
  }))
}

export function getGenderLabel(t: TFunction, gender: string) {
  if (gender === 'male' || gender === 'female' || gender === 'other') {
    return t(`patients.${gender}`)
  }
  return gender
}

/** Map validate() message strings to localized labels — validation logic unchanged. */
export function translateFormError(t: TFunction, message?: string) {
  if (!message) return undefined
  if (message === 'Required') return t('common.required')
  if (message === 'Invalid email address') return t('patients.invalidEmail')
  return message
}
