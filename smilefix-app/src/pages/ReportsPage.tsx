import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BarChart3, Users, DollarSign, Stethoscope, Package,
  TrendingUp, Calendar, FileText, FlaskConical, X, ShieldCheck,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import {
  ReportCard, AnalyticsWidget, ChartContainer, BarChart, DonutChart,
  FinancialReportPanel, InventoryReportPanel, PayrollReportPanel, AuditLogPanel,
} from '@/components/reports'
import { usePatientStore } from '@/store/patientStore'
import { useAppointmentStore } from '@/store/appointmentStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { useReportStore } from '@/store/reportStore'
import { formatCurrency } from '@/utils/format'

// ── Static chart data (kept for the overview charts) ─────────────────────────
const MONTHLY_REVENUE = [
  { label: 'Jan', value: 3200 }, { label: 'Feb', value: 4100 },
  { label: 'Mar', value: 3750 }, { label: 'Apr', value: 4800 },
  { label: 'May', value: 4200 }, { label: 'Jun', value: 4870 },
]
const TREATMENT_DIST = [
  { label: 'Preventive',  value: 38, color: 'var(--color-secondary)' },
  { label: 'Restorative', value: 24, color: 'var(--color-primary)' },
  { label: 'Orthodontic', value: 18, color: '#e76f51' },
  { label: 'Endodontic',  value: 12, color: 'var(--color-error)' },
  { label: 'Other',       value: 8,  color: 'var(--color-outline-variant)' },
]

// ── Tab definition ────────────────────────────────────────────────────────────
type ReportTab = 'overview' | 'financial' | 'inventory' | 'payroll' | 'audit'

const TABS: { id: ReportTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',   label: 'Overview',   icon: <BarChart3 size={14} /> },
  { id: 'financial',  label: 'Financial',  icon: <DollarSign size={14} /> },
  { id: 'inventory',  label: 'Inventory',  icon: <Package size={14} /> },
  { id: 'payroll',    label: 'Payroll',    icon: <Users size={14} /> },
  { id: 'audit',      label: 'Audit Log',  icon: <ShieldCheck size={14} /> },
]

export default function ReportsPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<ReportTab>('overview')

  const { patients }      = usePatientStore()
  const { appointments }  = useAppointmentStore()
  const { items }         = useInventoryStore()
  const { financial, exportLoading, exportReport } = useReportStore()

  const typeParam  = searchParams.get('type')
  const isLabFilter = typeParam === 'lab'
  const clearFilter = () => setSearchParams({}, { replace: true })

  const totalRevenue  = Number(financial?.totals.total_collected ?? 0)
  const outstanding   = Number(financial?.totals.total_outstanding ?? 0)
  const lowStockCount = items.filter((i) => i.status === 'low-stock' || i.status === 'out-of-stock').length

  const REPORT_CATALOGUE = [
    { title: 'Revenue & Billing Report', description: 'Monthly revenue, outstanding invoices, payment methods breakdown.',     icon: <DollarSign size={18} />,  category: 'Finance',    lastGenerated: 'Today' },
    { title: 'Inventory Usage Report',   description: 'Consumption rates, reorder alerts, supplier performance metrics.',      icon: <Package size={18} />,     category: 'Inventory',  lastGenerated: 'Today' },
    { title: 'Staff Payroll Report',     description: 'Monthly salary calculations, bonuses, deductions per staff member.',    icon: <Users size={18} />,       category: 'HR',         lastGenerated: 'Today' },
    { title: 'Patient Summary Report',   description: 'Total patients, new registrations, demographics and visit frequency.',  icon: <Users size={18} />,       category: 'Clinical',   lastGenerated: 'Oct 15, 2023' },
    { title: 'Treatment Analysis',       description: 'Most performed procedures, success rates, treatment duration averages.', icon: <Stethoscope size={18} />, category: 'Clinical',   lastGenerated: 'Oct 10, 2023' },
    { title: 'Appointment Statistics',   description: 'Booking rates, no-shows, cancellations and peak hours analysis.',       icon: <Calendar size={18} />,    category: 'Operations', lastGenerated: 'Oct 12, 2023' },
    { title: 'Staff Performance Report', description: 'Attendance, productivity, patient satisfaction scores per doctor.',     icon: <TrendingUp size={18} />,  category: 'HR',         lastGenerated: 'Oct 1, 2023' },
    { title: 'Insurance Claims Report',  description: 'Claims submitted, approved, rejected and pending by provider.',        icon: <FileText size={18} />,    category: 'Finance',    lastGenerated: 'Sep 30, 2023' },
    { title: 'Clinic Efficiency Report', description: 'Chair utilization, wait times, throughput and operational KPIs.',      icon: <BarChart3 size={18} />,   category: 'Operations', lastGenerated: 'Sep 28, 2023' },
    { title: 'Lab Results Summary',      description: 'Aggregated lab test results, turnaround times and abnormal findings.',  icon: <FlaskConical size={18} />,category: 'Lab',        lastGenerated: 'Oct 13, 2023' },
    { title: 'Radiology & X-Ray Log',    description: 'X-ray scans uploaded, reviewed and pending radiologist sign-off.',     icon: <FlaskConical size={18} />,category: 'Lab',        lastGenerated: 'Oct 11, 2023' },
  ]

  const visibleReports = isLabFilter
    ? REPORT_CATALOGUE.filter((r) => r.category === 'Lab')
    : REPORT_CATALOGUE

  // Map catalogue cards to live tabs where applicable
  const LIVE_TAB_MAP: Record<string, ReportTab> = {
    'Revenue & Billing Report': 'financial',
    'Inventory Usage Report':   'inventory',
    'Staff Payroll Report':     'payroll',
  }

  return (
    <div>
      <PageHeader
        title={t('reports.title')}
        subtitle={t('reports.subtitle')}
        breadcrumb={[{ label: t('nav.dashboard'), href: '/' }, { label: t('nav.reports') }]}
      />

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-6 border-b border-[var(--color-outline-variant)]/20 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px',
              activeTab === tab.id
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]',
            ].join(' ')}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <AnalyticsWidget label={t('reports.totalPatients')} value={String(patients.length)}      change={12}  icon={<Users size={18} />}      color="primary"   delay={0} />
            <AnalyticsWidget label={t('reports.revenue')}       value={formatCurrency(totalRevenue)} change={8.2} icon={<DollarSign size={18} />} color="secondary" delay={0.07} />
            <AnalyticsWidget label={t('reports.appointments')}  value={String(appointments.length)}  change={5}   icon={<Calendar size={18} />}   color="tertiary"  delay={0.14} />
            <AnalyticsWidget label={t('reports.outstanding')}   value={formatCurrency(outstanding)}  change={-3}  icon={<TrendingUp size={18} />} color="error"     delay={0.21} />
          </div>

          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-7">
              <ChartContainer title={t('reports.monthlyRevenue')} subtitle={t('reports.last6Months')} delay={0.1}>
                <BarChart data={MONTHLY_REVENUE.map((d) => ({ ...d, color: 'var(--color-primary-container)' }))} formatValue={formatCurrency} delay={0.15} />
              </ChartContainer>
            </div>
            <div className="col-span-12 lg:col-span-5">
              <ChartContainer title={t('reports.treatmentDist')} subtitle={t('reports.byCategory')} delay={0.15}>
                <DonutChart segments={TREATMENT_DIST} delay={0.2} />
              </ChartContainer>
            </div>
          </div>

          <SectionCard title={t('reports.availableReports')} icon={<FileText size={15} />} subtitle={t('reports.reportsDesc')} delay={0.2}>
            {isLabFilter && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 mb-4 px-3 py-2 rounded-[var(--radius-DEFAULT)] bg-[var(--color-tertiary-container)]/20 border border-[var(--color-tertiary)]/30">
                <FlaskConical size={14} className="text-[var(--color-tertiary)] shrink-0" />
                <span className="text-xs font-semibold text-[var(--color-on-tertiary-container)] flex-1">Showing Lab Reports only</span>
                <button onClick={clearFilter} className="flex items-center gap-1 text-[11px] font-bold text-[var(--color-tertiary)] hover:underline cursor-pointer">
                  <X size={12} /> Clear filter
                </button>
              </motion.div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {visibleReports.map((r, i) => (
                <ReportCard
                  key={r.title} {...r} delay={0.2 + i * 0.04}
                  onGenerate={LIVE_TAB_MAP[r.title] ? () => setActiveTab(LIVE_TAB_MAP[r.title]) : undefined}
                  onDownload={LIVE_TAB_MAP[r.title] ? () => setActiveTab(LIVE_TAB_MAP[r.title]) : undefined}
                />
              ))}
            </div>
          </SectionCard>
        </motion.div>
      )}

      {/* ── Live report tabs ──────────────────────────────────────────────────── */}
      {activeTab === 'financial' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <FinancialReportPanel />
        </motion.div>
      )}
      {activeTab === 'inventory' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <InventoryReportPanel />
        </motion.div>
      )}
      {activeTab === 'payroll' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <PayrollReportPanel />
        </motion.div>
      )}
      {activeTab === 'audit' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <AuditLogPanel />
        </motion.div>
      )}
    </div>
  )
}
