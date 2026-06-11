import { useState } from 'react'
import { Users, CalendarDays, CreditCard, Zap, UserPlus, CalendarPlus, FlaskConical, Upload, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  StatCard, QuickActions, AppointmentSummary, UpcomingAppointments,
  ActivityFeed, ChartCard,
  type ActivityItem,
} from '@/components/dashboard'
import { ImageAnalyzerModal } from '@/components/dashboard/ImageAnalyzerModal'
import { formatCurrency } from '@/utils/format'
import { ROUTES } from '@/constants/routes'
import { useDashboardStats, useRecentPatients, useTodaySchedule } from '@/hooks/useDashboard'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [analyzerOpen, setAnalyzerOpen] = useState(false)

  // ── Live data ──────────────────────────────────────────────────────────────
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    refetch: refetchStats,
  } = useDashboardStats()

  const {
    data: patients,
    isLoading: patientsLoading,
    isError: patientsError,
  } = useRecentPatients()

  const {
    data: schedule,
    isLoading: scheduleLoading,
  } = useTodaySchedule()

  // ── Stat cards ─────────────────────────────────────────────────────────────
  const statValue = (v: string | number | undefined, loading: boolean, error: boolean) => {
    if (loading) return '—'
    if (error)   return '!'
    return typeof v === 'number' ? v.toLocaleString() : (v ?? '—')
  }

  const STATS = [
    {
      label: t('dashboard.totalPatients'),
      value: statValue(stats?.totalPatients, statsLoading, statsError),
      icon: <Users size={22} />, color: 'primary' as const,
      trend: stats ? `+${stats.patientsThisMonth} ${t('dashboard.thisMonth')}` : undefined,
      trendUp: true,
      bgIcon: <Users size={64} />,
    },
    {
      label: t('dashboard.todayAppointments'),
      value: statValue(stats?.todayAppointments, statsLoading, statsError),
      icon: <CalendarDays size={22} />, color: 'secondary' as const,
      progress: stats ? Math.min(Math.round((stats.todayAppointments / 30) * 100), 100) : undefined,
      bgIcon: <CalendarDays size={64} />,
    },
    {
      label: t('dashboard.pendingPayments'),
      value: stats ? formatCurrency(stats.pendingPayments.total) : statValue(undefined, statsLoading, statsError),
      icon: <CreditCard size={22} />, color: 'tertiary' as const,
      alert: stats?.pendingPayments.overdueCount
        ? `${stats.pendingPayments.overdueCount} ${t('dashboard.invoicesOverdue')}`
        : undefined,
      bgIcon: <CreditCard size={64} />,
    },
    {
      label: t('dashboard.clinicEfficiency'),
      value: stats ? `${stats.clinicEfficiency}%` : statValue(undefined, statsLoading, statsError),
      icon: <Zap size={22} />, color: 'primary' as const,
      badge: stats ? t('status.optimized') : undefined,
      bgIcon: <Zap size={64} />,
    },
  ]

  const ACTIVITY: ActivityItem[] = [
    { icon: <Upload size={15} />,       color: 'primary',   text: <><strong>Dr. Peterson</strong> uploaded 4 new X-ray scans for patient ID-8821.</>, time: '15 mins ago' },
    { icon: <CheckCircle2 size={15} />, color: 'secondary', text: <><strong>Billing Dept</strong> confirmed payment for invoice #9921-A.</>, time: '42 mins ago' },
    { icon: <AlertCircle size={15} />,  color: 'error',     text: 'Low inventory alert: Dental gloves below minimum stock.', time: '1 hr ago' },
  ]

  const quickActions = [
    { label: t('dashboard.registerPatient'), icon: <UserPlus size={20} />,    variant: 'primary'    as const, onClick: () => navigate(ROUTES.PATIENTS) },
    { label: t('dashboard.scheduleAppt'),    icon: <CalendarPlus size={20} />, variant: 'secondary' as const, onClick: () => navigate(ROUTES.CALENDAR) },
    { label: t('dashboard.labReports'),      icon: <FlaskConical size={20} />, variant: 'tertiary'  as const, onClick: () => navigate(`${ROUTES.REPORTS}?type=lab`) },
  ]

  return (
    <div className="w-full overflow-x-hidden p-1"> {/* حماية إضافية للـ Overflow */}
      <PageHeader
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
        actions={
          <Button leftIcon={<CalendarPlus size={16} />} size="sm" onClick={() => navigate(ROUTES.CALENDAR)}>
            {/* إخفاء النص على الشاشات الصغيرة جداً لتجنب تداخل الهيدر */}
            <span className="hidden sm:inline">{t('dashboard.newAppointment')}</span>
          </Button>
        }
      />

      {/* Stats fetch error */}
      {statsError && (
        <div className="mb-4 flex items-center justify-between gap-3 px-4 py-3 rounded-[var(--radius-DEFAULT)] bg-[var(--color-error-container)] text-[var(--color-on-error-container)] text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} />
            <span className="line-clamp-2 sm:line-clamp-none">Could not load dashboard stats. Check your connection or permissions.</span>
          </div>
          <button
            onClick={() => refetchStats()}
            className="flex items-center gap-1 text-xs font-semibold underline underline-offset-2 hover:opacity-80 shrink-0"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {STATS.map((s, i) => (
          <StatCard key={s.label} {...s} delay={i * 0.07} />
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <QuickActions actions={quickActions} delay={0.28} />

          {patientsError ? (
            <Card className="flex items-center gap-3 px-6 py-5 text-sm text-[var(--color-error)]">
              <AlertCircle size={16} />
              <span>Could not load recent patients.</span>
            </Card>
          ) : patientsLoading ? (
            <Card className="px-6 py-5 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 rounded-[var(--radius-DEFAULT)] bg-[var(--color-surface-container-high)] animate-pulse" />
              ))}
            </Card>
          ) : (
            <AppointmentSummary
              patients={patients ?? []}
              title={t('dashboard.recentPatients')}
              onViewAll={() => navigate(ROUTES.PATIENTS)}
              onView={(id) => navigate(`/patients/${id}`)}
              delay={0.32}
            />
          )}

          {/* Bento */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.38 }}
            className="grid grid-cols-12 gap-4"
          >
            <div className="col-span-12 lg:col-span-5 bg-[var(--color-primary)] rounded-[var(--radius-xl)] p-6 sm:p-8 text-[var(--color-on-primary)] relative overflow-hidden group">
              <div className="relative z-10 space-y-3">
                <h2 className="text-xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {t('dashboard.precisionImaging')}
                </h2>
                <p className="text-sm opacity-80 max-w-xs leading-relaxed">{t('dashboard.imagingDesc')}</p>
                <Button variant="ghost" size="sm" className="bg-white text-[var(--color-primary)] hover:bg-white/90 mt-2 shadow-sm" onClick={() => setAnalyzerOpen(true)}>
                  {t('dashboard.launchAnalyzer')}
                </Button>
              </div>
              <div className="absolute -right-6 -bottom-6 opacity-[0.08] text-[160px] leading-none select-none pointer-events-none">⚕</div>
            </div>
            
            {/* تعديل الريسبونسف هنا: grid-cols-1 للأجهزة الصغيرة جداً و sm:grid-cols-2 للأكبر */}
            <div className="col-span-12 lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { emoji: '💊', title: t('dashboard.pharmacy'),  desc: t('dashboard.pharmacyDesc'),  hoverBorder: 'hover:border-[var(--color-tertiary)]/50', iconBg: 'bg-[var(--color-tertiary-container)]/20 text-[var(--color-tertiary)]' },
                { emoji: '📊', title: t('dashboard.analytics'), desc: t('dashboard.analyticsDesc'), hoverBorder: 'hover:border-[var(--color-secondary)]/50', iconBg: 'bg-[var(--color-secondary-container)]/20 text-[var(--color-secondary)]' },
              ].map((item) => (
                <Card key={item.title} hover className={`flex flex-col items-center text-center gap-3 px-4 py-6 transition-colors ${item.hoverBorder}`}>
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl ${item.iconBg}`}>{item.emoji}</div>
                  <h4 className="font-semibold text-sm text-[var(--color-on-surface)]">{item.title}</h4>
                  <p className="text-xs text-[var(--color-on-surface-variant)] leading-relaxed">{item.desc}</p>
                </Card>
              ))}
            </div>
          </motion.div>

          <ChartCard
            title={t('dashboard.treatmentDist')}
            description={t('dashboard.treatmentDistDesc')}
            placeholder
            placeholderLabel={t('dashboard.treatmentDist')}
            placeholderSublabel={t('dashboard.treatmentDistDesc')}
            onGenerate={() => navigate(ROUTES.REPORTS)}
            delay={0.42}
          />
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-6">
          <UpcomingAppointments
            items={scheduleLoading ? [] : (schedule ?? [])}
            title={t('dashboard.todaySchedule')}
            onViewAll={() => navigate(ROUTES.CALENDAR)}
            delay={0.3}
          />
          <ActivityFeed items={ACTIVITY} title={t('dashboard.activityLog')} delay={0.36} />
        </div>
      </div>

      {/* FAB - ممتع ومتجاوب تماماً للموبايل */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 20 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => navigate(ROUTES.CALENDAR)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-full shadow-[var(--shadow-modal)] flex items-center justify-center z-20 text-2xl sm:hidden" // يظهر فقط على الموبايل كونه يعوض الزر العلوي
        aria-label={t('dashboard.newAppointment')}
      >
        +
      </motion.button>

      {/* Precision Imaging Analyzer Modal */}
      <ImageAnalyzerModal open={analyzerOpen} onClose={() => setAnalyzerOpen(false)} />
    </div>
  )
}