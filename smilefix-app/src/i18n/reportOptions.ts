import type { TFunction } from 'i18next'
import type { AuditLog } from '@/services/reportService'

export const REPORT_TAB_IDS = ['overview', 'financial', 'inventory', 'payroll', 'audit'] as const
export type ReportTabId = (typeof REPORT_TAB_IDS)[number]

export const reportTabKey: Record<ReportTabId, string> = {
  overview:  'reports.tabs.overview',
  financial: 'reports.tabs.financial',
  inventory: 'reports.tabs.inventory',
  payroll:   'reports.tabs.payroll',
  audit:     'reports.tabs.audit',
}

export const REPORT_CATALOGUE_IDS = [
  'revenueBilling',
  'inventoryUsage',
  'staffPayroll',
  'patientSummary',
  'treatmentAnalysis',
  'appointmentStatistics',
  'staffPerformance',
  'insuranceClaims',
  'clinicEfficiency',
  'labResultsSummary',
  'radiologyLog',
] as const

export type ReportCatalogueId = (typeof REPORT_CATALOGUE_IDS)[number]

export const LIVE_TAB_MAP: Partial<Record<ReportCatalogueId, ReportTabId>> = {
  revenueBilling: 'financial',
  inventoryUsage: 'inventory',
  staffPayroll:   'payroll',
}

const REPORT_CATALOGUE_META: {
  id: ReportCatalogueId
  categoryKey: string
  lastGenerated: string
}[] = [
  { id: 'revenueBilling',        categoryKey: 'finance',    lastGenerated: 'today' },
  { id: 'inventoryUsage',        categoryKey: 'inventory',  lastGenerated: 'today' },
  { id: 'staffPayroll',          categoryKey: 'hr',         lastGenerated: 'today' },
  { id: 'patientSummary',        categoryKey: 'clinical',   lastGenerated: '2023-10-15' },
  { id: 'treatmentAnalysis',     categoryKey: 'clinical',   lastGenerated: '2023-10-10' },
  { id: 'appointmentStatistics', categoryKey: 'operations', lastGenerated: '2023-10-12' },
  { id: 'staffPerformance',      categoryKey: 'hr',         lastGenerated: '2023-10-01' },
  { id: 'insuranceClaims',       categoryKey: 'finance',    lastGenerated: '2023-09-30' },
  { id: 'clinicEfficiency',      categoryKey: 'operations', lastGenerated: '2023-09-28' },
  { id: 'labResultsSummary',     categoryKey: 'lab',        lastGenerated: '2023-10-13' },
  { id: 'radiologyLog',          categoryKey: 'lab',        lastGenerated: '2023-10-11' },
]

const TREATMENT_DIST_SOURCE = [
  { categoryKey: 'Preventive',  value: 38, color: 'var(--color-secondary)' },
  { categoryKey: 'Restorative', value: 24, color: 'var(--color-primary)' },
  { categoryKey: 'Orthodontic', value: 18, color: '#e76f51' },
  { categoryKey: 'Endodontic',  value: 12, color: 'var(--color-error)' },
  { categoryKey: 'Other',       value: 8,  color: 'var(--color-outline-variant)' },
] as const

const MONTHLY_REVENUE_VALUES = [3200, 4100, 3750, 4800, 4200, 4870]

const treatmentCategoryKey: Record<string, string> = {
  Preventive:  'treatments.cat_Preventive',
  Restorative: 'treatments.cat_Restorative',
  Orthodontic: 'treatments.cat_Orthodontic',
  Endodontic:  'treatments.cat_Endodontic',
  Other:       'reports.categories.other',
}

const reportCategoryKey: Record<string, string> = {
  finance:    'reports.categories.finance',
  inventory:  'reports.categories.inventory',
  hr:         'reports.categories.hr',
  clinical:   'reports.categories.clinical',
  operations: 'reports.categories.operations',
  lab:        'reports.categories.lab',
}

const paymentMethodKey: Record<string, string> = {
  CASH:   'reports.paymentMethods.cash',
  CARD:   'reports.paymentMethods.card',
  CREDIT: 'reports.paymentMethods.card',
  CHECK:  'reports.paymentMethods.check',
  BANK:   'reports.paymentMethods.bank',
  ONLINE: 'reports.paymentMethods.online',
}

const auditActionKey: Record<AuditLog['action'], string> = {
  CREATE:            'reports.auditActions.create',
  UPDATE:            'reports.auditActions.update',
  DELETE:            'reports.auditActions.delete',
  LOGIN:             'reports.auditActions.login',
  LOGOUT:            'reports.auditActions.logout',
  LOGIN_FAILED:      'reports.auditActions.loginFailed',
  PERMISSION_DENIED: 'reports.auditActions.permissionDenied',
}

const payrollStatusKey: Record<string, string> = {
  PAID:    'reports.payrollStatus.paid',
  PENDING: 'reports.payrollStatus.pending',
}

export function getReportTabLabel(t: TFunction, tab: ReportTabId) {
  return t(reportTabKey[tab])
}

export function buildReportCatalogue(t: TFunction) {
  return REPORT_CATALOGUE_META.map(({ id, categoryKey, lastGenerated }) => ({
    id,
    title: t(`reports.catalogue.${id}.title`),
    description: t(`reports.catalogue.${id}.description`),
    category: t(reportCategoryKey[categoryKey] ?? categoryKey),
    lastGeneratedKey: lastGenerated,
  }))
}

export function getReportLastGeneratedLabel(t: TFunction, language: string, key: string) {
  if (key === 'today') return t('reports.lastGeneratedToday')
  if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    const [y, m, d] = key.split('-').map(Number)
    return new Intl.DateTimeFormat(language, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(y, m - 1, d))
  }
  return key
}

export function buildMonthlyRevenueChartData(language: string) {
  return MONTHLY_REVENUE_VALUES.map((value, i) => ({
    label: new Intl.DateTimeFormat(language, { month: 'short' }).format(new Date(2025, i, 1)),
    value,
  }))
}

export function buildTreatmentDistributionData(t: TFunction) {
  return TREATMENT_DIST_SOURCE.map(({ categoryKey, value, color }) => {
    const key = treatmentCategoryKey[categoryKey]
    const label = key ? t(key) : categoryKey
    return { label, value, color }
  })
}

export function formatReportMonth(month: string, language: string) {
  const match = month.match(/^(\d{4})-(\d{2})$/)
  if (!match) return month
  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  return new Intl.DateTimeFormat(language, { month: 'long', year: 'numeric' }).format(new Date(year, monthIndex, 1))
}

export function getPaymentMethodLabel(t: TFunction, method: string) {
  const key = paymentMethodKey[method.toUpperCase()]
  if (!key) return method
  const translated = t(key)
  return translated === key ? method : translated
}

export function getAuditActionLabel(t: TFunction, action: AuditLog['action']) {
  const key = auditActionKey[action]
  if (!key) return action
  const translated = t(key)
  return translated === key ? action : translated
}

export function getPayrollStatusLabel(t: TFunction, status: string | null | undefined) {
  if (!status) return '—'
  const key = payrollStatusKey[status.toUpperCase()]
  if (!key) return status
  const translated = t(key)
  return translated === key ? status : translated
}

export function formatPayrollMonthTitle(t: TFunction, month: string, language: string) {
  const match = month.match(/^(\d{4})-(\d{2})$/)
  if (!match) return t('reports.staffPayrollTitle', { month })
  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  const formatted = new Intl.DateTimeFormat(language, { month: 'long', year: 'numeric' }).format(new Date(year, monthIndex, 1))
  return t('reports.staffPayrollTitle', { month: formatted })
}
