import { create } from 'zustand'
import type { Invoice, Payment, PaymentMethod } from '@/types'
import {
  fetchInvoices,
  fetchPatientInvoices,
  createInvoice,
  updateInvoice as apiUpdateInvoice,
  recordPayment as apiRecordPayment,
  fetchPaymentsForInvoices,
  fetchFinanceSummary,
  fetchPatientDebt,
  type CreateInvoicePayload,
  type RecordPaymentPayload,
  METHOD_TO_BACKEND,
  INVOICE_STATUS_TO_BACKEND,
} from '@/services/invoiceService'

interface FinanceState {
  invoices: Invoice[]
  payments: Payment[]
  isLoading: boolean
  error: string | null
  loadInvoices: (params?: { patientId?: string; status?: string }) => Promise<void>
  loadPatientInvoices: (patientId: string) => Promise<void>
  addInvoice: (payload: CreateInvoicePayload) => Promise<Invoice>
  updateInvoice: (id: string, data: Partial<Invoice>) => Promise<void>
  deleteInvoice: (id: string) => void
  recordPayment: (invoiceId: string, amount: number, method: PaymentMethod) => Promise<void>
  addPayment: (p: Payment) => void
  getInvoiceById: (id: string) => Invoice | undefined
  getInvoicesByPatient: (patientId: string) => Invoice[]
  getTotalRevenue: () => number
  getTotalOutstanding: () => number
  getOverdueAmount: () => number
  getMonthlyRevenue: (month: number, year: number) => number
}

let invoicesLoadSeq = 0

export const useFinanceStore = create<FinanceState>((set, get) => ({
  invoices: [],
  payments: [],
  isLoading: false,
  error: null,

  loadInvoices: async (params = {}) => {
    const seq = ++invoicesLoadSeq
    set({ isLoading: true, error: null })
    try {
      const backendStatus =
        params.status && params.status !== 'all'
          ? INVOICE_STATUS_TO_BACKEND[params.status]
          : undefined
      const result = await fetchInvoices({
        patient_id: params.patientId,
        status: backendStatus,
        limit: 100,
      })

      if (seq !== invoicesLoadSeq) return

      let payments: Payment[] = []
      try {
        payments = await fetchPaymentsForInvoices(
          result.invoices.map((inv) => ({
            id: inv.id,
            patientId: inv.patientId,
            patientName: inv.patientName,
            paid: inv.paid,
          })),
        )
      } catch {
        // Keep invoices visible even when payment log aggregation fails
        payments = []
      }

      if (seq !== invoicesLoadSeq) return
      set({ invoices: result.invoices, payments })
    } catch (err) {
      if (seq !== invoicesLoadSeq) return
      set({ error: err instanceof Error ? err.message : 'Failed to load invoices' })
    } finally {
      if (seq === invoicesLoadSeq) set({ isLoading: false })
    }
  },

  loadPatientInvoices: async (patientId) => {
    set({ isLoading: true, error: null })
    try {
      const result = await fetchPatientInvoices(patientId)
      set({ invoices: result.invoices, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  addInvoice: async (payload) => {
    const invoice = await createInvoice(payload)
    // Re-fetch the full list so patient name and server-computed fields are correct
    const result = await fetchInvoices({ limit: 100 })
    set({ invoices: result.invoices })
    return invoice
  },

  updateInvoice: async (id, data) => {
    set((s) => ({
      invoices: s.invoices.map((i) => (i.id === id ? { ...i, ...data } : i)),
    }))
    try {
      const backendStatus = data.status
        ? INVOICE_STATUS_TO_BACKEND[data.status]
        : undefined
      if (backendStatus) {
        const updated = await apiUpdateInvoice(id, {
          status: backendStatus as 'DRAFT' | 'ISSUED' | 'CANCELLED',
        })
        set((s) => ({
          invoices: s.invoices.map((i) => (i.id === id ? { ...i, ...updated } : i)),
        }))
      }
    } catch (err) {
      get().loadInvoices()
      throw err
    }
  },

  deleteInvoice: (id) => {
    // Optimistic removal for instant UI feedback
    set((s) => ({ invoices: s.invoices.filter((i) => i.id !== id) }))
  },

  recordPayment: async (invoiceId, amount, method) => {
    const payload: RecordPaymentPayload = { amount, method: METHOD_TO_BACKEND[method] }
    const payment = await apiRecordPayment(invoiceId, payload)
    set((s) => ({ payments: [payment, ...s.payments] }))
    const result = await fetchInvoices({ limit: 100 })
    set({ invoices: result.invoices })
  },

  addPayment: (p) => set((s) => ({ payments: [p, ...s.payments] })),

  getInvoiceById: (id) => get().invoices.find((i) => i.id === id),
  getInvoicesByPatient: (patientId) =>
    get().invoices.filter((i) => i.patientId === patientId),

  getTotalRevenue: () => get().invoices.reduce((sum, i) => sum + i.paid, 0),
  getTotalOutstanding: () =>
    get().invoices.reduce((sum, i) => sum + (i.total - i.paid), 0),
  getOverdueAmount: () =>
    get()
      .invoices.filter((i) => i.status === 'overdue')
      .reduce((sum, i) => sum + (i.total - i.paid), 0),
  getMonthlyRevenue: (month, year) =>
    get()
      .payments.filter((p) => {
        const d = new Date(p.date)
        return d.getMonth() === month && d.getFullYear() === year
      })
      .reduce((sum, p) => sum + p.amount, 0),
}))

export async function loadFinanceSummary(from?: string, to?: string) {
  return fetchFinanceSummary({ from, to })
}

export async function loadPatientDebt(patientId: string) {
  return fetchPatientDebt(patientId)
}