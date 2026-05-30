import { create } from 'zustand'
import {
  fetchFinancialReport,
  fetchInventoryReport,
  fetchPayrollReport,
  fetchAuditLogs,
  downloadReport,
  type FinancialReport,
  type InventoryReport,
  type PayrollReport,
  type AuditLog,
  type DateRangeParams,
  type InventoryParams,
  type ExportFormat,
} from '@/services/reportService'

interface ReportState {
  // ── Financial ──────────────────────────────────────────────────────────────
  financial: FinancialReport | null
  financialLoading: boolean
  financialError: string | null

  // ── Inventory ──────────────────────────────────────────────────────────────
  inventory: InventoryReport | null
  inventoryLoading: boolean
  inventoryError: string | null

  // ── Payroll ────────────────────────────────────────────────────────────────
  payroll: PayrollReport | null
  payrollLoading: boolean
  payrollError: string | null

  // ── Audit Logs ─────────────────────────────────────────────────────────────
  auditLogs: AuditLog[]
  auditTotal: number
  auditLoading: boolean
  auditError: string | null

  // ── Export ─────────────────────────────────────────────────────────────────
  exportLoading: boolean
  exportError: string | null

  // ── Actions ────────────────────────────────────────────────────────────────
  loadFinancial: (params?: DateRangeParams) => Promise<void>
  loadInventory: (params?: InventoryParams) => Promise<void>
  loadPayroll:   (month: string) => Promise<void>
  loadAuditLogs: (params?: { resource?: string; from?: string; to?: string; action?: AuditLog['action']; page?: number; limit?: number }) => Promise<void>
  exportReport:  (type: 'financial' | 'inventory' | 'payroll', format: ExportFormat, params?: Record<string, string | undefined>) => Promise<void>
}

export const useReportStore = create<ReportState>((set) => ({
  financial: null, financialLoading: false, financialError: null,
  inventory: null, inventoryLoading: false, inventoryError: null,
  payroll:   null, payrollLoading:   false, payrollError:   null,
  auditLogs: [],   auditTotal: 0, auditLoading: false, auditError: null,
  exportLoading: false, exportError: null,

  loadFinancial: async (params = {}) => {
    set({ financialLoading: true, financialError: null })
    try {
      const data = await fetchFinancialReport(params)
      set({ financial: data })
    } catch (e) {
      set({ financialError: (e as Error).message })
    } finally {
      set({ financialLoading: false })
    }
  },

  loadInventory: async (params = {}) => {
    set({ inventoryLoading: true, inventoryError: null })
    try {
      const data = await fetchInventoryReport(params)
      set({ inventory: data })
    } catch (e) {
      set({ inventoryError: (e as Error).message })
    } finally {
      set({ inventoryLoading: false })
    }
  },

  loadPayroll: async (month) => {
    set({ payrollLoading: true, payrollError: null })
    try {
      const data = await fetchPayrollReport(month)
      set({ payroll: data })
    } catch (e) {
      set({ payrollError: (e as Error).message })
    } finally {
      set({ payrollLoading: false })
    }
  },

  loadAuditLogs: async (params = {}) => {
    set({ auditLoading: true, auditError: null })
    try {
      const result = await fetchAuditLogs(params)
      set({ auditLogs: result.data, auditTotal: result.total })
    } catch (e) {
      set({ auditError: (e as Error).message })
    } finally {
      set({ auditLoading: false })
    }
  },

  exportReport: async (type, format, params = {}) => {
    set({ exportLoading: true, exportError: null })
    try {
      await downloadReport(type, format, params)
    } catch (e) {
      set({ exportError: (e as Error).message })
    } finally {
      set({ exportLoading: false })
    }
  },
}))
