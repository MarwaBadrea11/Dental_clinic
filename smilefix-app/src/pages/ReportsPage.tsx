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

// ── Static chart data ─────────────────────────────────────────────────────────
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

type ReportTab = 'overview' | 'financial' | 'inventory' | 'payroll' | 'audit'

export default function ReportsPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()

  const TABS: { id: ReportTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview',  label: t('reports.tabOverview'),  icon: <BarChart3 size={14} /> },
    { id: 'financial', label: t('reports.tabFinancial'), icon: <DollarSign size={14} /> },
    { id: 'inventory', label: t('reports.tabInventory'), icon: <Package size={14} /> },
    { id: 'payroll',   label: t('reports.tabPayroll'),   icon: <Users size={14} /> },
    { id: 'audit',     label: t('reports.tabAudit'),     icon: <ShieldCheck size={14} /> },
  ]

  const tabParam = searchParams.get('tab') as ReportTab | null
  const [activeTab, setActiveTab] = useState<ReportTab>(
    tabParam && TABS.some((tb) => tb.id === tabParam) ? tabParam : 'overview',
  )

  const handleTabChange = (tab: ReportTab) => {
    setActiveTab(tab)
    setSearchParams((prev) => { prev.set('tab', tab); return prev }, { replace: true })
  }

  const { patients }     = usePatientStore()
  const { appointments } = useAppointmentStore()
  const { items }        = useInventoryStore()
  const { financial }    = useReportStore()

  const typeParam   = searchParams.get('type')
  const isLabFilter = typeParam === 'lab'
  const clearFilter = () => setSearchParams({}, { replace: true })

  const totalRevenue  = Number(financial?.totals.total_collected ?? 0)
  const outstanding   = Number(financial?.totals.total_outstanding ?? 0)
  const lowStockCount = items.filter((i) => i.status === 'low-stock' || i.status === 'out-of-stock').length

  // ── Report catalogue (keys resolve via i18n) ──────────────────────────────
  const REPORT_CATALOGUE = [
    { titleKey: 'reportRevenue',    descKey: 'reportRevenueDesc',      icon: <DollarSign size={18} />,  catKey: 'catFinance',    tab: 'financial'  as ReportTab },
    { titleKey: 'reportInventory',  descKey: 'reportInventoryDesc',    icon: <Package size={18} />,     catKey: 'catInventory',  tab: 'inventory'  as ReportTab },
    { titleKey: 'reportPayroll',    descKey: 'reportPayrollDesc',      icon: <Users size={18} />,       catKey: 'catHR',         tab: 'payroll'    as ReportTab },
    { titleKey: 'reportPatient',    descKey: 'reportPatientDesc',      icon: <Users size={18} />,       catKey: 'catClinical',   tab: undefined },
    { titleKey: 'reportTreatment',  descKey: 'reportTreatmentDesc',    icon: <Stethoscope size={18} />, catKey: 'catClinical',   tab: undefined },
    { titleKey: 'reportAppointment',descKey: 'reportAppointmentDesc',  icon: <Calendar size={18} />,    catKey: 'catOperations', tab: undefined },
    { titleKey: 'reportStaffPerf',  descKey: 'reportStaffPerfDesc',    icon: <TrendingUp size={18} />,  catKey: 'catHR',         tab: undefined },
    { titleKey: 'reportInsurance',  descKey: 'reportInsuranceDesc',    icon: <FileText size={18} />,    catKey: 'catFinance',    tab: undefined },
    { titleKey: 'reportEfficiency', descKey: 'reportEfficiencyDesc',   icon: <BarChart3 size={18} />,   catKey: 'catOperations', tab: undefined },
    { titleKey: 'reportLab',        descKey: 'reportLabDesc',          icon: <FlaskConical size={18} />,catKey: 'catLab',        tab: undefined },
    { titleKey: 'reportXray',       descKey: 'reportXrayDesc',         icon: <FlaskConical size={18} />,catKey: 'catLab',        tab: undefined },
  ]

  const visibleReports = isLabFilter
    ? REPORT_CATALOGUE.filter((r) => r.catKey === 'catLab')
    : REPORT_CATALOGUE

  return (
    <div>
      <PageHeader
        title={t('reports.title')}
        subtitle={t('reports.subtitle')}
        breadcrumb={[{ label: t('nav.dashboard'), href: '/' }, { label: t('nav.reports') }]}
      />

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-6 border-b border-[var(--color-outline-variant)]/20 overflow-x-auto tab-bar-scroll">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
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

      {/* ── Overview ─────────────────────────────────────────────────────────── */}
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
                <BarChart
                  data={MONTHLY_REVENUE.map((d) => ({ ...d, color: 'var(--color-primary-container)' }))}
                  formatValue={formatCurrency}
                  delay={0.15}
                />
              </ChartContainer>
            </div>
            <div className="col-span-12 lg:col-span-5">
              <ChartContainer title={t('reports.treatmentDist')} subtitle={t('reports.byCategory')} delay={0.15}>
                <DonutChart segments={TREATMENT_DIST} delay={0.2} />
              </ChartContainer>
            </div>
          </div>

          <SectionCard
            title={t('reports.availableReports')}
            icon={<FileText size={15} />}
            subtitle={t('reports.reportsDesc')}
            delay={0.2}
          >
            {isLabFilter && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 mb-4 px-3 py-2 rounded-[var(--radius-DEFAULT)] bg-[var(--color-tertiary-container)]/20 border border-[var(--color-tertiary)]/30"
              >
                <FlaskConical size={14} className="text-[var(--color-tertiary)] shrink-0" />
                <span className="text-xs font-semibold text-[var(--color-on-tertiary-container)] flex-1">
                  {t('reports.labFilterLabel')}
                </span>
                <button
                  onClick={clearFilter}
                  className="flex items-center gap-1 text-[11px] font-bold text-[var(--color-tertiary)] hover:underline cursor-pointer"
                >
                  <X size={12} /> {t('reports.clearFilter')}
                </button>
              </motion.div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {visibleReports.map((r, i) => (
                <ReportCard
                  key={r.titleKey}
                  title={t(`reports.${r.titleKey}`)}
                  description={t(`reports.${r.descKey}`)}
                  icon={r.icon}
                  category={t(`reports.${r.catKey}`)}
                  lastGenerated={t('reports.today')}
                  delay={0.2 + i * 0.04}
                  onGenerate={r.tab ? () => handleTabChange(r.tab!) : undefined}
                  onDownload={r.tab ? () => handleTabChange(r.tab!) : undefined}
                />
              ))}
            </div>
          </SectionCard>
        </motion.div>
      )}

      {/* ── Live panels ────────────────────────────────────────────────────────── */}
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
