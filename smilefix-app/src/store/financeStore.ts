import { create } from 'zustand'
import type { Invoice, Payment, InvoiceStatus, PaymentMethod } from '@/types'

// ── Mock data ─────────────────────────────────────────────────────────────────

export const MOCK_INVOICES: Invoice[] = [
  {
    id: 'inv1', invoiceNumber: 'INV-2024-001', patientId: '1', patientName: 'Sarah Miller', patientCode: 'SF-90210',
    date: '2023-10-12', dueDate: '2023-11-12',
    items: [
      { id: 'li1', description: 'Root Canal Therapy — Tooth #14', quantity: 1, unitPrice: 1200, total: 1200 },
      { id: 'li2', description: 'Post-op X-Ray Series', quantity: 2, unitPrice: 90, total: 180 },
    ],
    total: 1380, paid: 1380, discount: 0, tax: 0,
    status: 'paid', paymentMethod: 'insurance', createdBy: 'Dr. Smith',
  },
  {
    id: 'inv2', invoiceNumber: 'INV-2024-002', patientId: '2', patientName: 'James Wilson', patientCode: 'SF-88421',
    date: '2023-10-14', dueDate: '2023-11-14',
    items: [
      { id: 'li3', description: 'Invisalign Checkup', quantity: 1, unitPrice: 100, total: 100 },
      { id: 'li4', description: 'Dental Cleaning', quantity: 1, unitPrice: 150, total: 150 },
      { id: 'li5', description: 'Fluoride Treatment', quantity: 1, unitPrice: 45, total: 45 },
    ],
    total: 295, paid: 0, discount: 0, tax: 0,
    status: 'overdue', paymentMethod: undefined, createdBy: 'Dr. Peterson',
    notes: 'Patient has outstanding balance from previous visits.',
  },
  {
    id: 'inv3', invoiceNumber: 'INV-2024-003', patientId: '3', patientName: 'Elena Rodriguez', patientCode: 'SF-77310',
    date: '2023-10-15', dueDate: '2023-11-15',
    items: [
      { id: 'li6', description: 'Braces Adjustment — Monthly', quantity: 1, unitPrice: 150, total: 150 },
    ],
    total: 150, paid: 150, discount: 0, tax: 0,
    status: 'paid', paymentMethod: 'card', createdBy: 'Dr. Smith',
  },
  {
    id: 'inv4', invoiceNumber: 'INV-2024-004', patientId: '4', patientName: 'Michael Chang', patientCode: 'SF-66201',
    date: '2023-10-16', dueDate: '2023-11-16',
    items: [
      { id: 'li7', description: 'Teeth Whitening — In-Office', quantity: 1, unitPrice: 400, total: 400 },
      { id: 'li8', description: 'Consultation Fee', quantity: 1, unitPrice: 75, total: 75 },
    ],
    total: 475, paid: 125, discount: 0, tax: 0,
    status: 'partial', paymentMethod: 'cash', createdBy: 'Dr. Lee',
    notes: 'Payment plan agreed: $125 upfront, remainder in 30 days.',
  },
  {
    id: 'inv5', invoiceNumber: 'INV-2024-005', patientId: '5', patientName: 'Olivia Thompson', patientCode: 'SF-55102',
    date: '2023-10-20', dueDate: '2023-11-20',
    items: [
      { id: 'li9', description: 'Composite Filling — Tooth #18', quantity: 1, unitPrice: 220, total: 220 },
      { id: 'li10', description: 'Local Anesthesia', quantity: 1, unitPrice: 40, total: 40 },
    ],
    total: 260, paid: 0, discount: 0, tax: 0,
    status: 'pending', createdBy: 'Dr. Smith',
  },
  {
    id: 'inv6', invoiceNumber: 'INV-2024-006', patientId: '7', patientName: 'Priya Sharma', patientCode: 'SF-33021',
    date: '2023-10-01', dueDate: '2023-11-01',
    items: [
      { id: 'li11', description: 'Crown Placement — Tooth #26', quantity: 1, unitPrice: 1500, total: 1500 },
      { id: 'li12', description: 'Temporary Crown', quantity: 1, unitPrice: 150, total: 150 },
    ],
    total: 1650, paid: 1650, discount: 100, tax: 0,
    status: 'paid', paymentMethod: 'insurance', createdBy: 'Dr. Peterson',
  },
  {
    id: 'inv7', invoiceNumber: 'INV-2024-007', patientId: '8', patientName: 'Robert Johnson', patientCode: 'SF-22010',
    date: '2023-09-20', dueDate: '2023-10-20',
    items: [
      { id: 'li13', description: 'Periodontal Scaling — Full Mouth', quantity: 1, unitPrice: 350, total: 350 },
      { id: 'li14', description: 'Antibiotic Prescription', quantity: 1, unitPrice: 45, total: 45 },
    ],
    total: 395, paid: 215, discount: 0, tax: 0,
    status: 'partial', paymentMethod: 'cash', createdBy: 'Dr. Lee',
  },
  {
    id: 'inv8', invoiceNumber: 'INV-2024-008', patientId: '6', patientName: 'David Park', patientCode: 'SF-44033',
    date: '2023-08-10', dueDate: '2023-09-10',
    items: [
      { id: 'li15', description: 'Tooth Extraction — #38', quantity: 1, unitPrice: 280, total: 280 },
      { id: 'li16', description: 'Post-extraction X-Ray', quantity: 1, unitPrice: 60, total: 60 },
    ],
    total: 340, paid: 340, discount: 0, tax: 0,
    status: 'paid', paymentMethod: 'card', createdBy: 'Dr. Peterson',
  },
]

export const MOCK_PAYMENTS: Payment[] = [
  { id: 'p1', invoiceId: 'inv1', patientId: '1', patientName: 'Sarah Miller', amount: 1380, method: 'insurance', date: '2023-10-12', reference: 'INS-BC-88421' },
  { id: 'p2', invoiceId: 'inv3', patientId: '3', patientName: 'Elena Rodriguez', amount: 150, method: 'card', date: '2023-10-15', reference: 'TXN-4521' },
  { id: 'p3', invoiceId: 'inv4', patientId: '4', patientName: 'Michael Chang', amount: 125, method: 'cash', date: '2023-10-16' },
  { id: 'p4', invoiceId: 'inv6', patientId: '7', patientName: 'Priya Sharma', amount: 1650, method: 'insurance', date: '2023-10-01', reference: 'INS-CG-33021' },
  { id: 'p5', invoiceId: 'inv7', patientId: '8', patientName: 'Robert Johnson', amount: 215, method: 'cash', date: '2023-09-20' },
  { id: 'p6', invoiceId: 'inv8', patientId: '6', patientName: 'David Park', amount: 340, method: 'card', date: '2023-08-10', reference: 'TXN-3301' },
]

// ── Store ─────────────────────────────────────────────────────────────────────

interface FinanceState {
  invoices: Invoice[]
  payments: Payment[]

  addInvoice: (inv: Invoice) => void
  updateInvoice: (id: string, data: Partial<Invoice>) => void
  deleteInvoice: (id: string) => void
  addPayment: (p: Payment) => void
  getInvoiceById: (id: string) => Invoice | undefined
  getInvoicesByPatient: (patientId: string) => Invoice[]

  // Computed helpers
  getTotalRevenue: () => number
  getTotalOutstanding: () => number
  getOverdueAmount: () => number
  getMonthlyRevenue: (month: number, year: number) => number
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  invoices: MOCK_INVOICES,
  payments: MOCK_PAYMENTS,

  addInvoice: (inv) => set((s) => ({ invoices: [inv, ...s.invoices] })),
  updateInvoice: (id, data) =>
    set((s) => ({ invoices: s.invoices.map((i) => i.id === id ? { ...i, ...data } : i) })),
  deleteInvoice: (id) =>
    set((s) => ({ invoices: s.invoices.filter((i) => i.id !== id) })),
  addPayment: (p) => set((s) => ({ payments: [p, ...s.payments] })),
  getInvoiceById: (id) => get().invoices.find((i) => i.id === id),
  getInvoicesByPatient: (patientId) => get().invoices.filter((i) => i.patientId === patientId),

  getTotalRevenue: () => get().invoices.reduce((sum, i) => sum + i.paid, 0),
  getTotalOutstanding: () => get().invoices.reduce((sum, i) => sum + (i.total - i.paid), 0),
  getOverdueAmount: () =>
    get().invoices.filter((i) => i.status === 'overdue').reduce((sum, i) => sum + (i.total - i.paid), 0),
  getMonthlyRevenue: (month, year) =>
    get().payments
      .filter((p) => { const d = new Date(p.date); return d.getMonth() === month && d.getFullYear() === year })
      .reduce((sum, p) => sum + p.amount, 0),
}))
