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

import { API_BASE, apiClient } from './apiClient'
import { getAccessToken, getRefreshToken, saveTokens } from './authService'

// ── Shared helpers ────────────────────────────────────────────────────────────

/**
 * Returns a valid (non-expired) Bearer token, refreshing it first if needed.
 * Falls back to the stored access token if refresh is not possible.
 */
async function getFreshToken(): Promise<string | null> {
  const token = getAccessToken()
  if (token) {
    // Check if it's still valid (exp > now + 30s)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (typeof payload.exp === 'number' && payload.exp * 1000 > Date.now() + 30_000) {
        return token
      }
    } catch { /* ignore parse errors, fall through to refresh */ }
  }

  // Token missing or expiring soon — try refresh
  const refreshToken = getRefreshToken()
  if (!refreshToken) return token  // return whatever we have

  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (res.ok) {
      const json = await res.json()
      const { accessToken, refreshToken: newRefresh } = json.data
      saveTokens(accessToken, newRefresh)
      return accessToken as string
    }
  } catch { /* ignore, fall through */ }

  return token
}

function buildQs(params: Record<string, string | number | boolean | undefined>): string {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, String(v))
  }
  return qs.toString() ? `?${qs}` : ''
}

async function getJson<T>(path: string): Promise<T> {
  return apiClient.get<T>(path)
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
  return getJson(`/reports/financial${buildQs(params as Record<string, string | undefined>)}`)
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
  const token = await getFreshToken()
  const raw = await fetch(
    `${API_BASE}/api/v1/reports/audit-logs${buildQs(params as Record<string, string | number | undefined>)}`,
    { headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } },
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
  const qs  = buildQs({ ...params, format })
  const url = `${API_BASE}/api/v1/reports/${type}/export${qs}`

  // Get a fresh (non-expired) token — this is the key fix.
  // If we send an expired token the server returns a 401 JSON response
  // which would otherwise get saved as a corrupt .xlsx file.
  const token = await getFreshToken()

  const res = await fetch(url, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  // Non-2xx → parse JSON error and throw a readable message
  if (!res.ok) {
    const text = await res.text()
    let message = `Export failed (${res.status})`
    try { message = (JSON.parse(text) as { error?: string }).error ?? message } catch { /* raw text */ }
    throw new Error(message)
  }

  // Safety: if the server returned JSON instead of a file body, show a real error
  const contentType = res.headers.get('Content-Type') ?? ''
  if (contentType.includes('application/json')) {
    const json = await res.json().catch(() => ({}))
    throw new Error((json as { error?: string }).error ?? 'Server returned JSON instead of a file')
  }

  const expectedMime = format === 'xlsx'
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'application/pdf'

  const buffer = await res.arrayBuffer()
  const blob   = new Blob([buffer], { type: expectedMime })
  const ext    = format === 'xlsx' ? 'xlsx' : 'pdf'

  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href     = objectUrl
  a.download = `${type}-report.${ext}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(objectUrl)
}
