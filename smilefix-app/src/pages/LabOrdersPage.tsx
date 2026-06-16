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
            color: 'text-[var(--color-primary)]',
            bg:    'bg-[var(--color-primary-container)]/20',
          },
          {
            label: t('labOrders.inProgress'),
            value: stats.inProgress,
            icon: <Activity size={18} />,
            color: 'text-[var(--color-secondary)]',
            bg:    'bg-[var(--color-secondary-container)]/20',
            iconClassName: stats.inProgress > 0 ? 'animate-pulse' : undefined,
          },
          {
            label: t('labOrders.readyForDelivery'),
            value: stats.ready,
            icon: <PackageCheck size={18} />,
            color: 'text-[var(--color-tertiary)]',
            bg:    'bg-[var(--color-tertiary-container)]/20',
          },
          {
            label: t('labOrders.delayedOrders'),
            value: stats.delayed,
            icon: <ClockAlert size={18} />,
            color: 'text-[var(--color-error)]',
            bg:    'bg-[var(--color-error-container)]/30',
            glow: stats.delayed > 0 ? 'shadow-[var(--shadow-glow-sm)]' : undefined,
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
