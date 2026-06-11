import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { CreditCard, DollarSign, TrendingUp, AlertCircle, Plus, List, LayoutGrid, FileText, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { Select } from '@/components/ui/Select'
import { Avatar } from '@/components/ui/Avatar'
import { DataTable, type DataTableColumn, type DataTableAction } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { FinancialCard, InvoiceCard, InvoiceStatusBadge, PaymentSummary, DebtWidget, RevenueStats, InvoiceViewModal, InvoiceFormModal } from '@/components/finance'
import { useFinanceStore } from '@/store/financeStore'
import { fetchPatients } from '@/services/patientService'
import type { CreateInvoicePayload } from '@/services/invoiceService'
import { formatDate, formatCurrency } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { Invoice, InvoiceStatus, PaymentMethod } from '@/types'

type ViewMode = 'overview' | 'invoices' | 'payments'

// Fallback chart data shown while finance summary loads
const FALLBACK_MONTHLY_DATA = [
  { month: 'Jan', revenue: 0, target: 0 },
  { month: 'Feb', revenue: 0, target: 0 },
  { month: 'Mar', revenue: 0, target: 0 },
  { month: 'Apr', revenue: 0, target: 0 },
  { month: 'May', revenue: 0, target: 0 },
  { month: 'Jun', revenue: 0, target: 0 },
]

export default function FinancePage() {
  const { t } = useTranslation()
  const { invoices, payments, financeSummary, updateInvoice, deleteInvoice, addInvoice, recordPayment: storeRecordPayment, getTotalRevenue, getTotalOutstanding, getOverdueAmount, loadInvoices, isLoading, error } = useFinanceStore()

  // Load real invoices on mount (also loads payments internally)
  useEffect(() => { loadInvoices() }, [loadInvoices])

  // Load finance summary (for revenue chart + accurate KPI cards)
  useEffect(() => {
    useFinanceStore.getState().loadFinanceSummaryData?.()
  }, [])

  // Load patients for the new invoice modal
  const [patients, setPatients] = useState<{ id: string; name: string; code: string }[]>([])
  useEffect(() => {
    fetchPatients({ limit: 200 })
      .then(({ patients: list }) =>
        setPatients(list.map((p) => ({ id: p.id, name: `${p.firstName} ${p.lastName}`, code: p.patientCode })))
      )
      .catch(() => {/* non-critical */})
  }, [])

  const [viewMode, setViewMode] = useState<ViewMode>('overview')

  // Reload payments whenever the user switches to the payments tab
  useEffect(() => {
    if (viewMode === 'payments') {
      // loadInvoices already fetches payments internally after loading invoices
      loadInvoices()
    }
  }, [viewMode]) // eslint-disable-line react-hooks/exhaustive-deps
  const [listMode, setListMode] = useState<'table' | 'grid'>('table')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showNewInvoice, setShowNewInvoice] = useState(false)
  const [isSavingInvoice, setIsSavingInvoice] = useState(false)
  const [pendingPayInvoice, setPendingPayInvoice] = useState<Invoice | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const STATUS_FILTER = [
    { value: 'all',     label: t('common.allStatuses') },
    { value: 'paid',    label: t('status.paid') },
    { value: 'pending', label: t('status.pending') },
    { value: 'overdue', label: t('status.overdue') },
    { value: 'partial', label: t('status.partial') },
    { value: 'draft',   label: t('status.draft') },
  ]

  const filtered = invoices.filter((inv) => {
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter
    const q = search.toLowerCase()
    const matchSearch = !q || [inv.invoiceNumber, inv.patientName, inv.patientCode ?? ''].some((v) => v.toLowerCase().includes(q))
    return matchStatus && matchSearch
  })

  const totalRevenue = financeSummary?.total_revenue ?? getTotalRevenue()
  const totalOutstanding = financeSummary?.total_outstanding ?? getTotalOutstanding()
  const overdueAmount = getOverdueAmount()
  const collectionRate = financeSummary?.collection_rate ?? (totalRevenue + totalOutstanding > 0 ? Math.round((totalRevenue / (totalRevenue + totalOutstanding)) * 100) : 0)
  const monthlyChartData = financeSummary?.monthly_revenue?.length ? financeSummary.monthly_revenue : FALLBACK_MONTHLY_DATA

  const handleStatusChange = (id: string, status: InvoiceStatus) => {
    // Only forward patchable statuses (draft ↔ pending/ISSUED).
    // 'paid', 'partial', 'overdue' are set by the backend via payment logic — don't PATCH them.
    if (status === 'paid' || status === 'partial' || status === 'overdue') return
    updateInvoice(id, { status })
    if (selectedInvoice?.id === id) setSelectedInvoice((i) => i ? { ...i, status } : null)
  }

  const handleRecordPayment = async (invoiceId: string, amount: number, method: PaymentMethod) => {
    try {
      await storeRecordPayment(invoiceId, amount, method)
      setPendingPayInvoice(null)
    } catch {
      // reload to sync state if payment failed
      loadInvoices()
    }
  }

  const handleDelete = async (id: string) => {
    setIsDeleting(true)
    try {
      await deleteInvoice(id)
      setConfirmDeleteId(null)
    } catch {
      // error already handled in store (reloads invoices)
    } finally {
      setIsDeleting(false)
    }
  }
  const columns: DataTableColumn<Invoice>[] = [
    {
      key: 'invoiceNumber', header: t('finance.invoiceNumber'), sortable: true,
      render: (inv) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[var(--radius-DEFAULT)] bg-[var(--color-primary-container)]/20 flex items-center justify-center text-[var(--color-primary)]"><FileText size={14} /></div>
          <div><p className="font-semibold text-sm">{inv.invoiceNumber}</p><p className="text-[11px] text-[var(--color-on-surface-variant)]">{inv.patientCode}</p></div>
        </div>
      ),
    },
    { key: 'patientName', header: t('common.patient'), sortable: true, render: (inv) => <div className="flex items-center gap-2"><Avatar name={inv.patientName} size="xs" /><span className="text-sm">{inv.patientName}</span></div> },
    { key: 'date',    header: t('common.date'),          sortable: true, render: (inv) => <span className="text-sm">{formatDate(inv.date)}</span> },
    { key: 'dueDate', header: t('finance.dueDate'),      sortable: true, render: (inv) => <span className="text-sm">{formatDate(inv.dueDate)}</span> },
    { key: 'total',   header: t('common.total'),         sortable: true, render: (inv) => <span className="text-sm font-semibold">{formatCurrency(inv.total)}</span> },
    { key: 'paid',    header: t('common.paid'),          sortable: true, render: (inv) => (
      <div><span className="text-sm font-semibold text-[var(--color-secondary)]">{formatCurrency(inv.paid)}</span>
        {inv.total - inv.paid > 0 && <p className="text-[10px] text-[var(--color-error)]">-{formatCurrency(inv.total - inv.paid)}</p>}
      </div>
    )},
    { key: 'status',  header: t('common.status'),        sortable: true, render: (inv) => <InvoiceStatusBadge status={inv.status} /> },
  ]

  const actions: DataTableAction<Invoice>[] = [
    { label: t('finance.invoiceNumber'), onClick: (inv) => setSelectedInvoice(inv) },
    { label: t('finance.markAsPaid'),    onClick: (inv) => setPendingPayInvoice(inv), hidden: (inv) => inv.status === 'paid' || inv.status === 'draft' },
    { label: t('common.delete'),         onClick: (inv) => setConfirmDeleteId(inv.id), danger: true, hidden: (inv) => inv.status === 'paid' },
  ]

  const TABS: { id: ViewMode; label: string }[] = [
    { id: 'overview',  label: t('finance.overview') },
    { id: 'invoices',  label: `${t('finance.invoices')} (${invoices.length})` },
    { id: 'payments',  label: `${t('finance.payments')} (${payments.length})` },
  ]

  return (
    <div>
      {/* Error banner */}
      {error && (
        <div className="mb-4 flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--color-error-container)]/20 border border-[var(--color-error)]/30 px-4 py-3 text-sm text-[var(--color-error)]">
          <AlertCircle size={16} className="shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => loadInvoices()} className="flex items-center gap-1 font-medium hover:opacity-70 transition-opacity">
            <RefreshCw size={13} /> {t('common.retry')}
          </button>
        </div>
      )}
      <PageHeader
        title={t('finance.title')}
        subtitle={t('finance.subtitle')}
        breadcrumb={[{ label: t('nav.dashboard'), href: '/' }, { label: t('nav.finance') }]}
        actions={<Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowNewInvoice(true)}>{t('finance.newInvoice')}</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <FinancialCard label={t('finance.totalRevenue')} value={formatCurrency(totalRevenue)} icon={<DollarSign size={18} />} variant="revenue" trend={`+8.2% ${t('finance.vsLastMonth')}`} trendUp delay={0} />
        <FinancialCard label={t('finance.outstanding')} value={formatCurrency(totalOutstanding)} icon={<CreditCard size={18} />} variant="outstanding" subtitle={`${invoices.filter((i) => i.status !== 'paid').length} ${t('finance.openInvoices')}`} delay={0.07} />
        <FinancialCard label={t('finance.overdue')} value={formatCurrency(overdueAmount)} icon={<AlertCircle size={18} />} variant="overdue" subtitle={`${invoices.filter((i) => i.status === 'overdue').length} ${t('finance.invoicesOverdue')}`} delay={0.14} />
        <FinancialCard label={t('finance.collectionRate')} value={`${collectionRate}%`} icon={<TrendingUp size={18} />} variant="paid" progress={collectionRate} trend={t('finance.targetRate')} trendUp={collectionRate >= 90} delay={0.21} />
      </div>

      <div className="flex items-center gap-1 bg-[var(--color-surface-container-low)] rounded-[var(--radius-lg)] p-1 mb-6 overflow-x-auto tab-bar-scroll max-w-full">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setViewMode(tab.id)}
            className={cn('px-4 py-2 rounded-[var(--radius-DEFAULT)] text-sm font-medium transition-all duration-200 whitespace-nowrap',
              viewMode === tab.id ? 'bg-[var(--color-surface-container-lowest)] text-[var(--color-primary)] shadow-[var(--shadow-card)]' : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]')}>
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-8"><RevenueStats data={monthlyChartData} delay={0.1} /></div>
              <div className="col-span-12 lg:col-span-4"><PaymentSummary payments={payments} delay={0.15} /></div>
              <div className="col-span-12 lg:col-span-6"><DebtWidget invoices={invoices} delay={0.2} onViewInvoice={setSelectedInvoice} /></div>
              <div className="col-span-12 lg:col-span-6">
                <SectionCard title={t('finance.recentInvoices')} icon={<FileText size={15} />} action={<Button variant="ghost" size="xs" onClick={() => setViewMode('invoices')}>{t('common.viewAll')}</Button>} delay={0.2}>
                  <div className="space-y-3">{invoices.slice(0, 4).map((inv, i) => <InvoiceCard key={inv.id} invoice={inv} onClick={setSelectedInvoice} delay={0.2 + i * 0.05} />)}</div>
                </SectionCard>
              </div>
            </div>
          </motion.div>
        )}

        {viewMode === 'invoices' && (
          <motion.div key="invoices" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <SectionCard noPadding>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-5 py-4 border-b border-[var(--color-outline-variant)]/20">
                <SearchBar value={search} onChange={setSearch} placeholder={t('finance.searchPlaceholder')} className="w-full sm:max-w-xs" />
                <div className="flex items-center gap-2 ml-auto">
                  <Select options={STATUS_FILTER} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} fullWidth={false} className="text-xs py-1.5" />
                  <div className="flex items-center bg-[var(--color-surface-container-low)] rounded-[var(--radius-DEFAULT)] p-0.5">
                    {(['table', 'grid'] as const).map((m) => (
                      <button key={m} onClick={() => setListMode(m)} className={cn('p-1.5 rounded transition-colors', listMode === m ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-on-surface-variant)]')}>
                        {m === 'table' ? <List size={15} /> : <LayoutGrid size={15} />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <AnimatePresence mode="wait">
                {listMode === 'table' ? (
                  <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <DataTable columns={columns} data={filtered} actions={actions} searchable={false} externalSearch={search} pageSize={8} emptyTitle={t('finance.noInvoices')} emptyIcon={<FileText size={28} />} onRowClick={setSelectedInvoice} />
                  </motion.div>
                ) : (
                  <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-5">
                    {filtered.length === 0 ? <p className="text-center text-sm text-[var(--color-on-surface-variant)] py-10">{t('finance.noInvoices')}</p> : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map((inv, i) => <InvoiceCard key={inv.id} invoice={inv} onClick={setSelectedInvoice} delay={i * 0.04} />)}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </SectionCard>
          </motion.div>
        )}

        {viewMode === 'payments' && (
          <motion.div key="payments" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-8">
                <SectionCard noPadding action={
                  <Button variant="ghost" size="xs" leftIcon={<RefreshCw size={12} />} loading={isLoading} onClick={() => loadInvoices()}>
                    {t('common.refresh')}
                  </Button>
                }>
                  <DataTable
                    columns={[
                      { key: 'patientName', header: t('common.patient'), sortable: true, render: (p) => <div className="flex items-center gap-2"><Avatar name={p.patientName} size="xs" /><span className="text-sm">{p.patientName}</span></div> },
                      { key: 'amount',    header: t('common.amount'),    sortable: true, render: (p) => <span className="text-sm font-bold text-[var(--color-secondary)]">{formatCurrency(p.amount)}</span> },
                      { key: 'method',    header: t('finance.method'),   sortable: true, render: (p) => <span className="text-sm capitalize">{p.method.replace('-', ' ')}</span> },
                      { key: 'date',      header: t('common.date'),      sortable: true, render: (p) => <span className="text-sm">{formatDate(p.date)}</span> },
                      { key: 'reference', header: t('finance.reference'),render: (p) => <span className="text-xs font-mono text-[var(--color-on-surface-variant)]">{p.reference ?? '—'}</span> },
                    ]}
                    data={payments} pageSize={8} searchPlaceholder={t('finance.searchPayments')} emptyTitle={t('finance.noPayments')}
                  />
                </SectionCard>
              </div>
              <div className="col-span-12 lg:col-span-4"><PaymentSummary payments={payments} delay={0.1} /></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <InvoiceViewModal invoice={selectedInvoice} open={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} onStatusChange={handleStatusChange} onRecordPayment={handleRecordPayment} />

      {/* "Mark as Paid" — opens the view modal with payment form pre-shown */}
      <InvoiceViewModal
        invoice={pendingPayInvoice}
        open={!!pendingPayInvoice}
        onClose={() => setPendingPayInvoice(null)}
        onStatusChange={handleStatusChange}
        onRecordPayment={handleRecordPayment}
        autoOpenPayForm
      />

      {/* Delete / Cancel confirmation */}
      <Modal
        open={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        title={t('finance.cancelInvoiceTitle')}
        description={t('finance.cancelInvoiceDesc')}
        size="sm"
      >
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)} disabled={isDeleting}>
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            className="bg-[var(--color-error)] hover:bg-[var(--color-error)]/90 text-white"
            onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
            disabled={isDeleting}
          >
            {isDeleting ? t('common.loading') : t('finance.cancelInvoice')}
          </Button>
        </div>
      </Modal>
      <InvoiceFormModal
        open={showNewInvoice}
        onClose={() => setShowNewInvoice(false)}
        patients={patients}
        isSaving={isSavingInvoice}
        onSave={async (data) => {
          setIsSavingInvoice(true)
          try {
            const payload: CreateInvoicePayload = {
              patient_id: data.patient_id,
              line_items: data.line_items,
              tax_rate: data.tax_rate,
              due_date: data.due_date,
            }
            await addInvoice(payload)
            setShowNewInvoice(false)
          } finally {
            setIsSavingInvoice(false)
          }
        }}
      />
    </div>
  )
}
