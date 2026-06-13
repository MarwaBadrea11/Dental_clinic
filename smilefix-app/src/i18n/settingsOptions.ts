import type { TFunction } from 'i18next'
import type { NotificationPreferences } from '@/services/notificationService'

export type SettingsTabId = 'profile' | 'appearance' | 'clinic' | 'workingHours' | 'notifications' | 'permissions' | 'security'

export const SETTINGS_TAB_IDS: SettingsTabId[] = [
  'profile', 'appearance', 'clinic', 'workingHours', 'notifications', 'permissions', 'security',
]

export const settingsTabKey: Record<SettingsTabId, string> = {
  profile:       'settings.profile',
  appearance:    'settings.appearance',
  clinic:        'settings.clinicInfo',
  workingHours:  'settings.workingHours',
  notifications: 'settings.notifications',
  permissions:   'settings.permissions',
  security:      'settings.security',
}

export const NOTIFICATION_PREF_KEYS = [
  'appointmentReminders',
  'newPatients',
  'paymentAlerts',
  'lowInventory',
  'systemUpdates',
  'weeklyReports',
  'smsNotifications',
  'emailDigest',
] as const satisfies readonly (keyof NotificationPreferences)[]

const timezoneKeyMap: Record<string, string> = {
  'UTC-8':    'settings.timezones.utcMinus8',
  'UTC-5':    'settings.timezones.utcMinus5',
  'UTC+0':    'settings.timezones.utc0',
  'UTC+3':    'settings.timezones.utcPlus3',
  'UTC+5:30': 'settings.timezones.utcPlus530',
}

export const TIMEZONE_VALUES = Object.keys(timezoneKeyMap)

const dateFormatKeyMap: Record<string, string> = {
  mdy: 'settings.dateFormats.mdy',
  dmy: 'settings.dateFormats.dmy',
  ymd: 'settings.dateFormats.ymd',
}

export const DATE_FORMAT_VALUES = Object.keys(dateFormatKeyMap)

const currencyKeyMap: Record<string, string> = {
  USD: 'settings.currencies.usd',
  EUR: 'settings.currencies.eur',
  SAR: 'settings.currencies.sar',
}

export const CURRENCY_VALUES = Object.keys(currencyKeyMap)

export const CLINIC_FIELD_KEYS = [
  'name', 'phone', 'email', 'website', 'address', 'city', 'taxId',
] as const

export const clinicFieldKey: Record<(typeof CLINIC_FIELD_KEYS)[number], string> = {
  name:    'settings.clinicName',
  phone:   'settings.phone',
  email:   'settings.email',
  website: 'settings.website',
  address: 'settings.address',
  city:    'settings.city',
  taxId:   'settings.taxId',
}

export const clinicPlaceholderKey: Record<(typeof CLINIC_FIELD_KEYS)[number], string> = {
  name:    'settings.placeholders.clinicName',
  phone:   'settings.placeholders.phone',
  email:   'settings.placeholders.email',
  website: 'settings.placeholders.website',
  address: 'settings.placeholders.address',
  city:    'settings.placeholders.city',
  taxId:   'settings.placeholders.taxId',
}

export const PERMISSION_ROLES = [
  {
    roleKey: 'admin',
    permissions: ['viewAll', 'editAll', 'delete', 'manageStaff', 'financialReports', 'systemSettings'],
  },
  {
    roleKey: 'doctor',
    permissions: ['viewPatients', 'editPatients', 'viewAppointments', 'editAppointments', 'viewTreatments', 'editTreatments'],
  },
  {
    roleKey: 'receptionist',
    permissions: ['viewPatients', 'viewAppointments', 'editAppointments', 'viewFinance'],
  },
  {
    roleKey: 'nurse',
    permissions: ['viewPatients', 'viewAppointments', 'viewTreatments'],
  },
] as const

export function getSettingsTabLabel(t: TFunction, tab: SettingsTabId) {
  return t(settingsTabKey[tab])
}

export function getNotificationPrefLabel(t: TFunction, key: keyof NotificationPreferences) {
  return t(`settings.${key}`)
}

export function buildLanguageSelectOptions(t: TFunction) {
  return [
    { value: 'en', label: t('settings.languages.en') },
    { value: 'ar', label: t('settings.languages.ar') },
  ]
}

export function buildTimezoneSelectOptions(t: TFunction) {
  return TIMEZONE_VALUES.map((value) => ({
    value,
    label: t(timezoneKeyMap[value]),
  }))
}

export function buildDateFormatSelectOptions(t: TFunction) {
  return DATE_FORMAT_VALUES.map((value) => ({
    value,
    label: t(dateFormatKeyMap[value]),
  }))
}

export function buildCurrencySelectOptions(t: TFunction) {
  return CURRENCY_VALUES.map((value) => ({
    value,
    label: t(currencyKeyMap[value]),
  }))
}

export function getPermissionRoleLabel(t: TFunction, roleKey: string) {
  const key = `settings.roles.${roleKey}`
  const translated = t(key)
  return translated === key ? roleKey : translated
}

export function getPermissionLabel(t: TFunction, permKey: string) {
  const key = `settings.permissionItems.${permKey}`
  const translated = t(key)
  return translated === key ? permKey : translated
}

/** Locale-aware weekday labels (Monday–Sunday). */
export function getWeekdayLabels(language: string) {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(2025, 0, 6 + i)
    return new Intl.DateTimeFormat(language, { weekday: 'long' }).format(date)
  })
}

export function getOpenClosedLabel(t: TFunction, isOpen: boolean) {
  return isOpen ? t('settings.open') : t('settings.closed')
}
