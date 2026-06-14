import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Truck, Clock, Receipt, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageStatsGrid } from '@/components/shared/PageStatsGrid'
import { SectionCard } from '@/components/ui/SectionCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { SupplierCard } from '@/components/inventory'
import { useInventoryStore } from '@/store/inventoryStore'
import { useFinanceStore } from '@/store/financeStore'
import type { Supplier } from '@/types'

function buildSuppliersFromInventory(items: ReturnType<typeof useInventoryStore.getState>['items']): Supplier[] {
  const map = new Map<string, Supplier>()

  for (const item of items) {
    const name = item.supplierName?.trim()
    if (!name) continue

    const existing = map.get(name)
    if (existing) {
      existing.totalOrders = (existing.totalOrders ?? 0) + 1
      continue
    }

    map.set(name, {
      id: name,
      name,
      status: 'active',
      totalOrders: 1,
      category: item.category,
    })
  }

  return Array.from(map.values())
}

export default function SuppliersPage() {
  const { t } = useTranslation()
  const { items, loadInventory } = useInventoryStore()
  const { invoices, loadInvoices } = useFinanceStore()

  useEffect(() => {
    void loadInventory()
    void loadInvoices()
  }, [loadInventory, loadInvoices])

  const suppliers = useMemo(() => buildSuppliersFromInventory(items), [items])

  const stats = useMemo(() => ({
    totalSuppliers: suppliers.length,
    pendingOrders: items.filter((i) => i.status === 'low-stock' || i.status === 'out-of-stock').length,
    dueInvoices: invoices.filter((i) => i.status === 'overdue' || i.status === 'partial' || i.status === 'pending').length,
    activeCompanies: suppliers.filter((s) => s.status === 'active').length,
  }), [suppliers, items, invoices])

  return (
    <div>
      <PageHeader
        title={t('suppliersPage.title')}
        subtitle={t('suppliersPage.subtitle')}
        breadcrumb={[{ label: t('nav.dashboard'), href: '/' }, { label: t('suppliersPage.title') }]}
      />

      <PageStatsGrid
        className="mb-6"
        stats={[
          {
            label: t('suppliersPage.totalSuppliers'),
            value: stats.totalSuppliers,
            icon: <Truck size={18} />,
            color: 'text-cyan-600 dark:text-cyan-400',
            bg: 'bg-cyan-50 dark:bg-cyan-950/30',
          },
          {
            label: t('suppliersPage.pendingOrders'),
            value: stats.pendingOrders,
            icon: <Clock size={18} />,
            color: 'text-yellow-600 dark:text-yellow-400',
            bg: 'bg-yellow-50 dark:bg-yellow-950/30',
          },
          {
            label: t('suppliersPage.dueInvoices'),
            value: stats.dueInvoices,
            icon: <Receipt size={18} />,
            color: 'text-rose-600 dark:text-rose-400',
            bg: 'bg-rose-50 dark:bg-rose-950/30',
            glow: stats.dueInvoices > 0 ? 'shadow-[0_0_16px_rgba(244,63,94,0.1)]' : undefined,
          },
          {
            label: t('suppliersPage.activeCompanies'),
            value: stats.activeCompanies,
            icon: <ShieldCheck size={18} />,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-50 dark:bg-emerald-950/30',
          },
        ]}
      />

      <SectionCard title={t('inventory.suppliers')} icon={<Truck size={15} />}>
        {suppliers.length === 0 ? (
          <EmptyState
            title={t('suppliersPage.emptyTitle')}
            description={t('suppliersPage.emptyDesc')}
            icon={<Truck size={28} />}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {suppliers.map((s, i) => (
              <SupplierCard key={s.id} supplier={s} delay={i * 0.04} />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
