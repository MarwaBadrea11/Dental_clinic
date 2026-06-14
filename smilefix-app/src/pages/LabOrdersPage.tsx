import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { FlaskConical, Activity, PackageCheck, ClockAlert } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageStatsGrid } from '@/components/shared/PageStatsGrid'
import { SectionCard } from '@/components/ui/SectionCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { useLabOrderStore } from '@/store/labOrderStore'

export default function LabOrdersPage() {
  const { t } = useTranslation()
  const { orders, loadLabOrders } = useLabOrderStore()

  useEffect(() => {
    void loadLabOrders()
  }, [loadLabOrders])

  const stats = useMemo(() => ({
    total: orders.length,
    inProgress: orders.filter((o) => o.status === 'in-progress').length,
    ready: orders.filter((o) => o.status === 'ready').length,
    delayed: orders.filter((o) => o.status === 'delayed').length,
  }), [orders])

  return (
    <div>
      <PageHeader
        title={t('labOrders.title')}
        subtitle={t('labOrders.subtitle')}
        breadcrumb={[{ label: t('nav.dashboard'), href: '/' }, { label: t('labOrders.title') }]}
      />

      <PageStatsGrid
        className="mb-6"
        stats={[
          {
            label: t('labOrders.totalOrders'),
            value: stats.total,
            icon: <FlaskConical size={18} />,
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-50 dark:bg-blue-950/30',
          },
          {
            label: t('labOrders.inProgress'),
            value: stats.inProgress,
            icon: <Activity size={18} />,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-50 dark:bg-amber-950/30',
            iconClassName: stats.inProgress > 0 ? 'animate-pulse' : undefined,
          },
          {
            label: t('labOrders.readyForDelivery'),
            value: stats.ready,
            icon: <PackageCheck size={18} />,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-50 dark:bg-emerald-950/30',
          },
          {
            label: t('labOrders.delayedOrders'),
            value: stats.delayed,
            icon: <ClockAlert size={18} />,
            color: 'text-rose-600 dark:text-rose-400',
            bg: 'bg-rose-50 dark:bg-rose-950/30',
            glow: stats.delayed > 0 ? 'shadow-[0_0_16px_rgba(244,63,94,0.1)]' : undefined,
          },
        ]}
      />

      <SectionCard title={t('labOrders.title')} icon={<FlaskConical size={15} />}>
        {orders.length === 0 ? (
          <EmptyState
            title={t('labOrders.emptyTitle')}
            description={t('labOrders.emptyDesc')}
            icon={<FlaskConical size={28} />}
          />
        ) : null}
      </SectionCard>
    </div>
  )
}
