import { useState } from 'react'
import {
  Users, CalendarDays, CreditCard, Zap,
  UserPlus, CalendarPlus, FlaskConical,
  Upload, CheckCircle2, AlertCircle, RefreshCw,
  Activity,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  StatCard, QuickActions, AppointmentSummary, UpcomingAppointments,
  ActivityFeed,
  type ActivityItem,
} from '@/components/dashboard'
import { ImageAnalyzerModal } from '@/components/dashboard/ImageAnalyzerModal'
import { formatCurrency } from '@/utils/format'
import { ROUTES } from '@/constants/routes'
import { useDashboardStats, useRecentPatients, useTodaySchedule } from '@/hooks/useDashboard'

// ── Cinematic easing ──────────────────────────────────────────────────────────
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const

// ── Stagger variants ──────────────────────────────────────────────────────────
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 22 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT_EXPO } },
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [analyzerOpen, setAnalyzerOpen] = useState(false)

  const {
    data: stats, isLoading: statsLoading,
    isError: statsError, refetch: refetchStats,
  } = useDashboardStats()

  const { data: patients, isLoading: patientsLoading, isError: patientsError } = useRecentPatients()
  const { data: schedule, isLoading: scheduleLoading } = useTodaySchedule()

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
    { label: t('dashboard.registerPatient'), icon: <UserPlus size={22} />,    variant: 'primary'   as const, onClick: () => navigate(ROUTES.PATIENTS) },
    { label: t('dashboard.scheduleAppt'),    icon: <CalendarPlus size={22} />, variant: 'secondary' as const, onClick: () => navigate(ROUTES.CALENDAR) },
    { label: t('dashboard.labReports'),      icon: <FlaskConical size={22} />, variant: 'tertiary'  as const, onClick: () => navigate(`${ROUTES.REPORTS}?type=lab`) },
  ]

  return (
    <div className="w-full overflow-x-hidden">

      {/* ── Page header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE_OUT_EXPO }}
      >
        <PageHeader
          title={t('dashboard.title')}
          subtitle={t('dashboard.subtitle')}
          actions={
            <Button leftIcon={<CalendarPlus size={16} />} size="sm" onClick={() => navigate(ROUTES.CALENDAR)}>
              <span className="hidden sm:inline">{t('dashboard.newAppointment')}</span>
            </Button>
          }
        />
      </motion.div>

      {/* Stats error banner */}
      {statsError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
          className="mb-4 flex items-center justify-between gap-3 px-4 py-3 rounded-[var(--radius-DEFAULT)] bg-[var(--color-error-container)] text-[var(--color-on-error-container)] text-sm"
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={15} />
            <span>Could not load dashboard stats. Check your connection or permissions.</span>
          </div>
          <button
            onClick={() => refetchStats()}
            className="flex items-center gap-1 text-xs font-semibold underline underline-offset-2 hover:opacity-80 shrink-0"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </motion.div>
      )}

      {/* ── Stat cards ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6"
      >
        {STATS.map((s) => (
          <motion.div key={s.label} variants={itemVariants}>
            <StatCard {...s} delay={0} />
          </motion.div>
        ))}
      </motion.div>

      {/* ── Quick action cards + AI card ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch mb-6"
      >
        {/* 3 glassmorphic quick-action cards */}
        <QuickActions stretch actions={quickActions} delay={0} />

        {/* AI Precision Imaging card — teal/emerald medical glass */}
        <motion.div variants={itemVariants} className="h-full min-h-0">
          <motion.div
            whileHover={{
              y: -5,
              scale: 1.02,
              boxShadow: '0 16px 48px 0 rgba(0,105,111,0.32), 0 0 28px 0 rgba(121,213,220,0.26)',
              transition: { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] },
            }}
            whileTap={{ scale: 0.98 }}
            className="relative flex h-full min-h-0 flex-col justify-between overflow-hidden rounded-[var(--radius-xl)] p-6 cursor-pointer"
            style={{
              /* Deep teal → aquamarine → dark emerald */
              background: 'linear-gradient(145deg, #004f54 0%, #00696f 40%, #1a5c50 75%, #0d3d35 100%)',
              border: '1px solid rgba(121,213,220,0.30)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 8px 32px 0 rgba(0,105,111,0.28), 0 0 16px 0 rgba(121,213,220,0.12)',
              color: 'white',
              minHeight: '120px',
            }}
            onClick={() => setAnalyzerOpen(true)}
          >
            {/* Light-source glass sheen — top-left sweep */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, rgba(121,213,220,0.14) 0%, rgba(255,255,255,0.04) 40%, transparent 65%)',
              }}
            />

            {/* Depth layer — subtle dark vignette on bottom-right */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at bottom right, rgba(0,0,0,0.18) 0%, transparent 60%)',
              }}
            />

            {/* Ambient aquamarine glow blob */}
            <motion.div
              animate={{ scale: [1, 1.22, 1], opacity: [0.18, 0.32, 0.18] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(121,213,220,0.45), transparent 70%)' }}
            />

            {/* Caduceus watermark — desaturated teal, barely visible */}
            <div
              className="pointer-events-none absolute right-3 bottom-2 text-[72px] leading-none select-none"
              style={{ color: 'rgba(121,213,220,0.10)' }}
            >
              ⚕
            </div>

            {/* Content */}
            <div className="relative z-10 space-y-2">
              {/* AI-Powered pill badge — teal glass */}
              <motion.div
                animate={{ boxShadow: ['0 0 0px rgba(121,213,220,0)', '0 0 10px rgba(121,213,220,0.45)', '0 0 0px rgba(121,213,220,0)'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest mb-0.5"
                style={{
                  background: 'rgba(121,213,220,0.18)',
                  border: '1px solid rgba(121,213,220,0.38)',
                  color: 'rgba(185,242,247,1)',
                }}
              >
                <Activity size={9} /> AI-Powered
              </motion.div>

              <h2
                className="text-[15px] font-extrabold leading-snug text-white"
                style={{ fontFamily: 'Manrope, sans-serif', textShadow: '0 1px 8px rgba(0,0,0,0.25)' }}
              >
                {t('dashboard.precisionImaging')}
              </h2>
              <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(185,242,247,0.80)' }}>
                {t('dashboard.imagingDesc')}
              </p>
            </div>

            {/* Launch Analyzer CTA — crisp white, purple text, teal focus ring */}
            <motion.button
              whileHover={{ scale: 1.04, boxShadow: '0 0 0 2px rgba(121,213,220,0.55), 0 4px 14px rgba(0,0,0,0.15)' }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="relative z-10 mt-5 w-fit px-4 py-1.5 rounded-lg text-[11px] font-bold shadow-md focus-visible:outline-none"
              style={{
                background: 'rgba(255,255,255,0.97)',
                color: '#004b4f',           /* deep teal-charcoal — on-primary-container token */
                border: '1px solid rgba(121,213,220,0.25)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.14)',
              }}
              onClick={(e) => { e.stopPropagation(); setAnalyzerOpen(true) }}
            >
              {t('dashboard.launchAnalyzer')} →
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* ── Main grid — patients table + sidebar ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-12 gap-5 items-start"
      >
        {/* Recent patients — 8 cols */}
        <motion.div variants={itemVariants} className="col-span-12 lg:col-span-8 flex flex-col gap-5">
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
              delay={0}
            />
          )}
        </motion.div>

        {/* Right sidebar — 4 cols */}
        <motion.div
          variants={containerVariants}
          className="col-span-12 lg:col-span-4 flex flex-col gap-5 self-start"
        >
          <motion.div variants={itemVariants}>
            <UpcomingAppointments
              items={scheduleLoading ? [] : (schedule ?? [])}
              title={t('dashboard.todaySchedule')}
              onViewAll={() => navigate(ROUTES.CALENDAR)}
              delay={0}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <ActivityFeed items={ACTIVITY} title={t('dashboard.activityLog')} delay={0} />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* FAB — mobile only */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.7, type: 'spring', stiffness: 260, damping: 18 }}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate(ROUTES.CALENDAR)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-full flex items-center justify-center z-20 text-2xl sm:hidden"
        style={{ boxShadow: '0 0 24px 4px rgba(0,105,111,0.35), 0 4px 16px rgba(0,0,0,0.15)' }}
        aria-label={t('dashboard.newAppointment')}
      >
        +
      </motion.button>

      <ImageAnalyzerModal open={analyzerOpen} onClose={() => setAnalyzerOpen(false)} />
    </div>
  )
}
