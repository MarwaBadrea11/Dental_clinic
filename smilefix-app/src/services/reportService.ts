// ─────────────────────────────────────────────────────────────────────────────
// Report Service
// Endpoints:
//   GET  /reports/financial          → FinancialReport
//   GET  /reports/financial/export   → PDF or XLSX download
//   GET  /reports/inventory          → InventoryReport
//   GET  /reports/inventory/export
//   GET  /reports/payroll            → PayrollReport  (?month=YYYY-MM)
//   GET  /reports/payroll/export
//   GET  /reports/audit-logs         → paginated AuditLog[]
// ─────────────────────────────────────────────────────────────────────────────

import { API_BASE } from './apiClient'
import { getAccessToken } from './authService'

// ── Shared helpers ────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const token = getAccessToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function buildQs(params: Record<string, string | number | boolean | undefined>): string {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, String(v))
  }
  return qs.toString() ? `?${qs}` : ''
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders() })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error ?? 'Request failed')
  return json.data as T
}

// ── Backend shapes ────────────────────────────────────────────────────────────

export interface FinancialTotals {
  total_invoiced: string
  total_collected: string
  total_outstanding: string
  invoice_count: string
}

export interface MonthlyBreakdown {
  month: string        // 'YYYY-MM'
  invoiced: string
  collected: string
}

export interface PaymentMethodBreakdown {
  method: string
  total: string
  count: string
}

export interface TopProcedure {
  procedure_name: string
  revenue: string
  occurrences: string
}

export interface FinancialReport {
  totals: FinancialTotals
  monthly: MonthlyBreakdown[]
  byMethod: PaymentMethodBreakdown[]
  topProcedures: TopProcedure[]
}

export interface InventorySummary {
  total_items: string
  total_stock_value: string
  low_stock_count: string
  out_of_stock_count: string
}

export interface InventoryItem {
  id: string
  name: string
  sku: string | null
  quantity: number
  unit: string
  reorder_level: number
  unit_cost: string
  stock_value: string
  is_low_stock: boolean
  category: string | null
}

export interface InventoryReport {
  summary: InventorySummary
  items: InventoryItem[]
}

export interface PayrollTotals {
  headcount: string
  total_base: string
  total_bonuses: string
  total_deductions: string
  total_net: string
}

export interface PayrollRecord {
  user_id: string
  username: string
  email: string
  role: string
  full_name: string | null
  base_salary: string
  bonuses: string
  deductions: string
  net_salary: string
  payment_date: string
  status: string
}

export interface PayrollReport {
  month: string
  totals: PayrollTotals
  records: PayrollRecord[]
}

export interface AuditLog {
  id: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'PERMISSION_DENIED'
  resource: string
  resource_id: string | null
  previous_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
  actor: string | null
  actor_role: string | null
}

// ── Query param types ─────────────────────────────────────────────────────────

export interface DateRangeParams {
  from?: string   // YYYY-MM-DD
  to?: string
}

export interface InventoryParams {
  category?: string
  lowStockOnly?: boolean
}

export interface AuditLogParams extends DateRangeParams {
  resource?: string
  action?: AuditLog['action']
  page?: number
  limit?: number
}

export type ExportFormat = 'pdf' | 'xlsx'

// ── API calls ─────────────────────────────────────────────────────────────────

export async function fetchFinancialReport(params: DateRangeParams = {}): Promise<FinancialReport> {
  return getJson(`/reports/financial${buildQs(params)}`)
}

export async function fetchInventoryReport(params: InventoryParams = {}): Promise<InventoryReport> {
  return getJson(`/reports/inventory${buildQs(params as Record<string, string | boolean | undefined>)}`)
}

export async function fetchPayrollReport(month: string): Promise<PayrollReport> {
  return getJson(`/reports/payroll?month=${month}`)
}

export async function fetchAuditLogs(
  params: AuditLogParams = {},
): Promise<{ data: AuditLog[]; total: number; page: number; limit: number }> {
  const raw = await fetch(
    `${API_BASE}/reports/audit-logs${buildQs(params as Record<string, string | number | undefined>)}`,
    { headers: authHeaders() },
  )
  const json = await raw.json()
  if (!raw.ok) throw new Error(json?.error ?? 'Request failed')
  return { data: json.data, ...json.meta }
}

// ── Export (triggers browser download) ───────────────────────────────────────

type ReportType = 'financial' | 'inventory' | 'payroll'

/**
 * Fetches the export endpoint and triggers a browser file download.
 * No third-party library needed — uses a temporary <a> element.
 */
export async function downloadReport(
  type: ReportType,
  format: ExportFormat,
  params: Record<string, string | undefined> = {},
): Promise<void> {
  const qs = buildQs({ ...params, format })
  const url = `${API_BASE}/reports/${type}/export${qs}`

  const res = await fetch(url, { headers: authHeaders() })

  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error((json as { error?: string }).error ?? 'Export failed')
  }

  const blob = await res.blob()
  const ext  = format === 'xlsx' ? 'xlsx' : 'pdf'
  const mime = format === 'xlsx'
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'application/pdf'

  const objectUrl = URL.createObjectURL(new Blob([blob], { type: mime }))
  const a = document.createElement('a')
  a.href     = objectUrl
  a.download = `${type}-report.${ext}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(objectUrl)
}
