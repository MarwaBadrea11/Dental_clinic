import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BarChart3, Users, DollarSign, Stethoscope, Package, TrendingUp, Calendar, FileText, FlaskConical, X } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { Select } from '@/components/ui/Select'
import { ReportCard, AnalyticsWidget, ExportButtons, ChartContainer, BarChart, DonutChart } from '@/components/reports'
import { usePatientStore } from '@/store/patientStore'
import { useFinanceStore } from '@/store/financeStore'
import { useAppointmentStore } from '@/store/appointmentStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { formatCurrency } from '@/utils/format'

const MONTHLY_REVENUE = [
  { label: 'May', value: 3200 }, { label: 'Jun', value: 4100 },
  { label: 'Jul', value: 3750 }, { label: 'Aug', value: 4800 },
  { label: 'Sep', value: 4200 }, { label: 'Oct', value: 4870 },
]

const TREATMENT_DIST = [
  { label: 'Preventive',  value: 38, color: 'var(--color-secondary)' },
  { label: 'Restorative', value: 24, color: 'var(--color-primary)' },
  { label: 'Orthodontic', value: 18, color: '#e76f51' },
  { label: 'Endodontic',  value: 12, color: 'var(--color-error)' },
  { label: 'Other',       value: 8,  color: 'var(--color-outline-variant)' },
]

export default function ReportsPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { patients } = usePatientStore()
  const { invoices, getTotalRevenue, getTotalOutstanding } = useFinanceStore()
  const { appointments } = useAppointmentStore()
  const { items } = useInventoryStore()
  const [period, setPeriod] = useState('30d')

  // ?type=lab activates the lab filter banner
  const typeParam = searchParams.get('type')
  const isLabFilter = typeParam === 'lab'

  const clearFilter = () => setSearchParams({}, { replace: true })

  const PERIOD_OPTIONS = [
    { value: '30d', label: t('reports.last30Days') },
    { value: '90d', label: t('reports.lastQuarter') },
    { value: '1y',  label: t('reports.thisYear') },
  ]

  const REPORT_CATALOGUE = [
    { title: 'Patient Summary Report',   description: 'Total patients, new registrations, demographics and visit frequency.',  icon: <Users size={18} />,          category: 'Clinical',   lastGenerated: 'Oct 15, 2023' },
    { title: 'Revenue & Billing Report', description: 'Monthly revenue, outstanding invoices, payment methods breakdown.',     icon: <DollarSign size={18} />,     category: 'Finance',    lastGenerated: 'Oct 14, 2023' },
    { title: 'Treatment Analysis',       description: 'Most performed procedures, success rates, treatment duration averages.', icon: <Stethoscope size={18} />,    category: 'Clinical',   lastGenerated: 'Oct 10, 2023' },
    { title: 'Appointment Statistics',   description: 'Booking rates, no-shows, cancellations and peak hours analysis.',       icon: <Calendar size={18} />,       category: 'Operations', lastGenerated: 'Oct 12, 2023' },
    { title: 'Inventory Usage Report',   description: 'Consumption rates, reorder alerts, supplier performance metrics.',      icon: <Package size={18} />,        category: 'Inventory',  lastGenerated: 'Oct 8, 2023' },
    { title: 'Staff Performance Report', description: 'Attendance, productivity, patient satisfaction scores per doctor.',     icon: <TrendingUp size={18} />,     category: 'HR',         lastGenerated: 'Oct 1, 2023' },
    { title: 'Insurance Claims Report',  description: 'Claims submitted, approved, rejected and pending by provider.',        icon: <FileText size={18} />,       category: 'Finance',    lastGenerated: 'Sep 30, 2023' },
    { title: 'Clinic Efficiency Report', description: 'Chair utilization, wait times, throughput and operational KPIs.',      icon: <BarChart3 size={18} />,      category: 'Operations', lastGenerated: 'Sep 28, 2023' },
    { title: 'Lab Results Summary',      description: 'Aggregated lab test results, turnaround times and abnormal findings.',  icon: <FlaskConical size={18} />,   category: 'Lab',        lastGenerated: 'Oct 13, 2023' },
    { title: 'Radiology & X-Ray Log',    description: 'X-ray scans uploaded, reviewed and pending radiologist sign-off.',     icon: <FlaskConical size={18} />,   category: 'Lab',        lastGenerated: 'Oct 11, 2023' },
    { title: 'Pathology Report',         description: 'Biopsy submissions, histology results and follow-up action items.',    icon: <FlaskConical size={18} />,   category: 'Lab',        lastGenerated: 'Oct 5, 2023' },
  ]

  // Apply lab filter when ?type=lab is present
  const visibleReports = isLabFilter
    ? REPORT_CATALOGUE.filter((r) => r.category === 'Lab')
    : REPORT_CATALOGUE

  const totalRevenue = getTotalRevenue()
  const outstanding = getTotalOutstanding()
  const completedAppts = appointments.filter((a) => a.status === 'completed').length
  const lowStockCount = items.filter((i) => i.status === 'low-stock' || i.status === 'out-of-stock').length

  return (
    <div>
      <PageHeader
        title={t('reports.title')}
        subtitle={t('reports.subtitle')}
        breadcrumb={[{ label: t('nav.dashboard'), href: '/' }, { label: t('nav.reports') }]}
        actions={
          <div className="flex items-center gap-2">
            <Select options={PERIOD_OPTIONS} value={period} onChange={(e) => setPeriod(e.target.value)} fullWidth={false} className="text-xs py-1.5" />
            <ExportButtons onExportPDF={() => {}} onExportCSV={() => {}} onExportExcel={() => {}} />
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <AnalyticsWidget label={t('reports.totalPatients')} value={String(patients.length)}      change={12}  icon={<Users size={18} />}      color="primary"   delay={0} />
        <AnalyticsWidget label={t('reports.revenue')}       value={formatCurrency(totalRevenue)} change={8.2} icon={<DollarSign size={18} />} color="secondary" delay={0.07} />
        <AnalyticsWidget label={t('reports.appointments')}  value={String(appointments.length)}  change={5}   icon={<Calendar size={18} />}   color="tertiary"  delay={0.14} />
        <AnalyticsWidget label={t('reports.outstanding')}   value={formatCurrency(outstanding)}  change={-3}  icon={<TrendingUp size={18} />} color="error"     delay={0.21} />
      </div>

      <div className="grid grid-cols-12 gap-6 mb-6">
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: t('reports.completionRate'), value: `${completedAppts > 0 ? Math.round((completedAppts / appointments.length) * 100) : 0}%`, sub: `${completedAppts} ${t('reports.completed')}` },
          { label: t('reports.paidInvoices'),   value: `${invoices.filter((i) => i.status === 'paid').length}`, sub: `${t('reports.ofTotalInvoices')} ${invoices.length}` },
          { label: t('reports.lowStockItems'),  value: String(lowStockCount), sub: t('reports.needRestocking') },
          { label: t('reports.activePatients'), value: String(patients.filter((p) => p.status === 'active').length), sub: t('reports.ofTotal') },
        ].map((s) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-lg)] border border-[var(--color-outline-variant)]/20 shadow-[var(--shadow-card)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{s.label}</p>
            <p className="text-2xl font-bold text-[var(--color-primary)] mt-1">{s.value}</p>
            <p className="text-[11px] text-[var(--color-on-surface-variant)] mt-0.5">{s.sub}</p>
          </motion.div>
        ))}
      </div>

      <SectionCard title={t('reports.availableReports')} icon={<FileText size={15} />} subtitle={t('reports.reportsDesc')} delay={0.2}>
        {/* Lab filter active banner */}
        {isLabFilter && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 mb-4 px-3 py-2 rounded-[var(--radius-DEFAULT)] bg-[var(--color-tertiary-container)]/20 border border-[var(--color-tertiary)]/30"
          >
            <FlaskConical size={14} className="text-[var(--color-tertiary)] shrink-0" />
            <span className="text-xs font-semibold text-[var(--color-on-tertiary-container)] flex-1">
              Showing Lab Reports only
            </span>
            <button
              onClick={clearFilter}
              className="flex items-center gap-1 text-[11px] font-bold text-[var(--color-tertiary)] hover:underline cursor-pointer"
            >
              <X size={12} /> Clear filter
            </button>
          </motion.div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visibleReports.map((r, i) => <ReportCard key={r.title} {...r} onGenerate={() => {}} onDownload={() => {}} delay={0.2 + i * 0.04} />)}
        </div>
      </SectionCard>
    </div>
  )
}
