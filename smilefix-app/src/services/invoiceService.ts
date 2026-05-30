// ─────────────────────────────────────────────────────────────────────────────
// Invoice Service
// Endpoints:
//   GET    /invoices
//   GET    /invoices/:id
//   POST   /invoices
//   PATCH  /invoices/:id
//   GET    /invoices/:id/payments
//   POST   /invoices/:id/payments
//   POST   /invoices/:id/payments/:paymentId/refund
//   GET    /patients/:patientId/invoices
//   GET    /patients/:patientId/debt
//   GET    /finance/summary
// ─────────────────────────────────────────────────────────────────────────────

import { apiClient, API_BASE } from './apiClient'
import type { Invoice, Payment, InvoiceStatus, PaymentMethod } from '@/types'

// ── Backend shapes ────────────────────────────────────────────────────────────

export type BackendInvoiceStatus =
  | 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED'

export type BackendPaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'INSURANCE'

export interface BackendLineItem {
  description: string
  quantity: number
  unit_cost: number
  total: number
  procedure_id?: string | null
  tooth_number?: string | null
}

export interface BackendInvoice {
  id: string
  invoice_number: string | null
  patient_id: string
  appointment_id: string | null
  treatment_plan_id: string | null
  line_items: BackendLineItem[]
  subtotal: string
  tax_rate: string
  tax_amount: string
  total_amount: string
  amount_paid: string
  status: BackendInvoiceStatus
  due_date: string | null
  issued_at: string | null
  issued_by: string | null
  created_at: string
  updated_at: string
  payments?: BackendPayment[]
}

export interface BackendPayment {
  id: string
  invoice_id: string
  amount: string
  method: BackendPaymentMethod
  reference: string | null
  notes: string | null
  paid_at: string
  recorded_by: string | null
  created_at: string
  refunds?: BackendRefund[]
}

export interface BackendRefund {
  id: string
  amount: string
  reason: string
  refunded_at: string
}

export interface BackendDebt {
  patient_id: string
  outstanding_balance: number
}

export interface BackendFinanceSummary {
  total_revenue: number
  total_outstanding: number
  payment_methods: { method: BackendPaymentMethod; total: number }[]
}

export interface BackendPaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

// ── Payloads ──────────────────────────────────────────────────────────────────

export interface CreateInvoicePayload {
  patient_id: string
  appointment_id?: string | null
  treatment_plan_id?: string | null
  line_items: BackendLineItem[]
  tax_rate?: number
  due_date?: string | null
}

export interface UpdateInvoicePayload {
  status?: 'DRAFT' | 'ISSUED' | 'CANCELLED'
  due_date?: string | null
  line_items?: BackendLineItem[]
  tax_rate?: number
}

export interface RecordPaymentPayload {
  amount: number
  method: BackendPaymentMethod
  reference?: string | null
  notes?: string | null
  paid_at?: string
}

export interface RecordRefundPayload {
  amount: number
  reason: string
}

// ── Status / method mappers ───────────────────────────────────────────────────

const STATUS_MAP: Record<BackendInvoiceStatus, InvoiceStatus> = {
  DRAFT:          'draft',
  ISSUED:         'pending',
  PARTIALLY_PAID: 'partial',
  PAID:           'paid',
  OVERDUE:        'overdue',
  CANCELLED:      'draft',
}

export const INVOICE_STATUS_TO_BACKEND: Record<string, BackendInvoiceStatus> = {
  draft:    'DRAFT',
  pending:  'ISSUED',
  partial:  'PARTIALLY_PAID',
  paid:     'PAID',
  overdue:  'OVERDUE',
}

const METHOD_MAP: Record<BackendPaymentMethod, PaymentMethod> = {
  CASH:          'cash',
  CARD:          'card',
  BANK_TRANSFER: 'bank-transfer',
  INSURANCE:     'insurance',
}

export const METHOD_TO_BACKEND: Record<PaymentMethod, BackendPaymentMethod> = {
  cash:           'CASH',
  card:           'CARD',
  'bank-transfer':'BANK_TRANSFER',
  insurance:      'INSURANCE',
  check:          'CASH',  // fallback
}

// ── Mappers ───────────────────────────────────────────────────────────────────

export function mapInvoice(b: BackendInvoice, patientName = ''): Invoice {
  const lineItems = (Array.isArray(b.line_items) ? b.line_items : []).map((li, i) => ({
    id: `${b.id}-li${i}`,
    description: li.description,
    quantity: li.quantity,
    unitPrice: li.unit_cost,
    total: li.total,
    treatmentId: li.procedure_id ?? undefined,
  }))

  return {
    id: b.id,
    invoiceNumber: b.invoice_number ?? `DRAFT-${b.id.slice(0, 8)}`,
    patientId: b.patient_id,
    patientName,
    date: b.issued_at ? b.issued_at.split('T')[0] : b.created_at.split('T')[0],
    dueDate: b.due_date ?? '',
    items: lineItems,
    total: parseFloat(b.total_amount),
    paid: parseFloat(b.amount_paid),
    tax: parseFloat(b.tax_amount),
    status: STATUS_MAP[b.status] ?? 'draft',
    notes: undefined,
    createdBy: b.issued_by ?? undefined,
  }
}

export function mapPayment(b: BackendPayment, patientId = '', patientName = ''): Payment {
  return {
    id: b.id,
    invoiceId: b.invoice_id,
    patientId,
    patientName,
    amount: parseFloat(b.amount),
    method: METHOD_MAP[b.method] ?? 'cash',
    date: b.paid_at.split('T')[0],
    reference: b.reference ?? undefined,
    notes: b.notes ?? undefined,
  }
}

// ── API calls ─────────────────────────────────────────────────────────────────

export interface ListInvoicesParams {
  patient_id?: string
  status?: BackendInvoiceStatus
  from?: string
  to?: string
  page?: number
  limit?: number
}

export async function fetchInvoices(params: ListInvoicesParams = {}): Promise<{
  invoices: Invoice[]
  total: number
  page: number
  limit: number
}> {
  const qs = new URLSearchParams()
  if (params.patient_id) qs.set('patient_id', params.patient_id)
  if (params.status)     qs.set('status', params.status)
  if (params.from)       qs.set('from', params.from)
  if (params.to)         qs.set('to', params.to)
  if (params.page)       qs.set('page', String(params.page))
  if (params.limit)      qs.set('limit', String(params.limit))

  const query = qs.toString() ? `?${qs}` : ''

  // Use raw fetch to access both data array and meta (pagination)
  const { getAccessToken } = await import('./authService')
  const token = getAccessToken()
  const rawRes = await fetch(`${API_BASE}/invoices${query}`, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
  const json = await rawRes.json()

  return {
    invoices: (Array.isArray(json.data) ? json.data as BackendInvoice[] : []).map((b) => mapInvoice(b)),
    total: json.meta?.total ?? 0,
    page: json.meta?.page ?? 1,
    limit: json.meta?.limit ?? 20,
  }
}

export async function createInvoice(payload: CreateInvoicePayload): Promise<Invoice> {
  const b = await apiClient.post<BackendInvoice>('/invoices', payload)
  return mapInvoice(b)
}

export async function fetchInvoiceById(id: string): Promise<Invoice & { payments: Payment[] }> {
  const b = await apiClient.get<BackendInvoice & { payments: BackendPayment[] }>(`/invoices/${id}`)
  const invoice = mapInvoice(b)
  const payments = (b.payments ?? []).map((p) => mapPayment(p, b.patient_id))
  return { ...invoice, payments }
}

export async function updateInvoice(id: string, payload: UpdateInvoicePayload): Promise<Invoice> {
  const b = await apiClient.patch<BackendInvoice>(`/invoices/${id}`, payload)
  return mapInvoice(b)
}

export async function fetchInvoicePayments(invoiceId: string): Promise<Payment[]> {
  const payments = await apiClient.get<BackendPayment[]>(`/invoices/${invoiceId}/payments`)
  return payments.map((p) => mapPayment(p))
}

export async function recordPayment(
  invoiceId: string,
  payload: RecordPaymentPayload,
): Promise<Payment> {
  const b = await apiClient.post<BackendPayment>(`/invoices/${invoiceId}/payments`, payload)
  return mapPayment(b)
}

export async function refundPayment(
  invoiceId: string,
  paymentId: string,
  payload: RecordRefundPayload,
): Promise<BackendRefund> {
  return apiClient.post(`/invoices/${invoiceId}/payments/${paymentId}/refund`, payload)
}

export async function fetchPatientInvoices(
  patientId: string,
  params: { status?: BackendInvoiceStatus; page?: number; limit?: number } = {},
): Promise<{ invoices: Invoice[]; total: number }> {
  const qs = new URLSearchParams()
  if (params.status) qs.set('status', params.status)
  if (params.page)   qs.set('page', String(params.page))
  if (params.limit)  qs.set('limit', String(params.limit))

  const query = qs.toString() ? `?${qs}` : ''

  const { getAccessToken } = await import('./authService')
  const token = getAccessToken()
  const rawRes = await fetch(`${API_BASE}/patients/${patientId}/invoices${query}`, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
  const json = await rawRes.json()

  return {
    invoices: (Array.isArray(json.data) ? json.data as BackendInvoice[] : []).map((b) => mapInvoice(b)),
    total: json.meta?.total ?? 0,
  }
}

export async function fetchPatientDebt(patientId: string): Promise<BackendDebt> {
  return apiClient.get(`/patients/${patientId}/debt`)
}

export async function fetchFinanceSummary(params: {
  from?: string
  to?: string
} = {}): Promise<BackendFinanceSummary> {
  const qs = new URLSearchParams()
  if (params.from) qs.set('from', params.from)
  if (params.to)   qs.set('to', params.to)
  const query = qs.toString() ? `?${qs}` : ''
  return apiClient.get(`/finance/summary${query}`)
}
