import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Package, Plus, List, LayoutGrid, AlertTriangle, RefreshCw, Truck } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/ui/FormField'
import { EmptyState } from '@/components/ui/EmptyState'
import { DataTable, type DataTableColumn, type DataTableAction } from '@/components/ui/DataTable'
import { StockBadge, ExpiryIndicator, SupplierCard, InventoryStats } from '@/components/inventory'
import { useInventoryStore } from '@/store/inventoryStore'
import { formatCurrency } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { InventoryItem, Supplier, InventoryCategory } from '@/types'

type ViewMode = 'inventory' | 'suppliers' | 'alerts'
type ListMode = 'table' | 'grid'

function RestockModal({ item, open, onClose, onRestock }: { item: InventoryItem | null; open: boolean; onClose: () => void; onRestock: (id: string, qty: number) => void }) {
  const { t } = useTranslation()
  const [qty, setQty] = useState('10')
  if (!item) return null
  return (
    <Modal open={open} onClose={onClose} title={`${t('inventory.restock')} — ${item.name}`} size="sm">
      <div className="space-y-4">
        <div className="bg-[var(--color-surface-container-low)] rounded-[var(--radius-DEFAULT)] p-3 text-sm">
          <p className="text-[var(--color-on-surface-variant)]">{t('inventory.currentStock')}: <span className="font-bold text-[var(--color-on-surface)]">{item.quantity} {item.unit}</span></p>
          <p className="text-[var(--color-on-surface-variant)]">{t('inventory.minStockLabel')}: <span className="font-bold text-[var(--color-on-surface)]">{item.minStock} {item.unit}</span></p>
        </div>
        <FormField label={t('inventory.quantityToAdd')} required>
          <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} min="1" />
        </FormField>
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
          <Button size="sm" leftIcon={<RefreshCw size={13} />} onClick={() => { onRestock(item.id, parseInt(qty) || 0); onClose() }}>
            {t('inventory.confirmRestock')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function AddItemModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (item: InventoryItem) => void }) {
  const { t } = useTranslation()
  const [form, setForm] = useState({ name: '', sku: '', category: 'Consumables' as InventoryCategory, quantity: '', unit: 'piece', minStock: '5', price: '', supplierName: '', expiryDate: '', location: '' })
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const handleSave = () => {
    if (!form.name || !form.price) return
    const qty = parseInt(form.quantity) || 0
    const min = parseInt(form.minStock) || 5
    const status = qty === 0 ? 'out-of-stock' : qty <= min ? 'low-stock' : 'in-stock'
    onSave({ id: `i${Date.now()}`, name: form.name, sku: form.sku || undefined, category: form.category, quantity: qty, unit: form.unit, minStock: min, price: parseFloat(form.price) || 0, supplierName: form.supplierName || undefined, expiryDate: form.expiryDate || undefined, location: form.location || undefined, status, lastRestocked: new Date().toISOString().split('T')[0] })
    onClose()
  }

  const CATS = [
    ...(['Consumables','Instruments','Medications','Protective Equipment','Impression Materials','Restorative','Sterilization','Equipment'] as InventoryCategory[])
      .map((c) => ({ value: c, label: c })),
  ]

  return (
    <Modal open={open} onClose={onClose} title={t('inventory.addItemTitle')} size="lg">
      <div className="grid grid-cols-2 gap-4">
        <FormField label={t('inventory.itemName')} required className="col-span-2"><Input placeholder="Nitrile Gloves (M)" value={form.name} onChange={(e) => set('name', e.target.value)} /></FormField>
        <FormField label={t('inventory.sku')}><Input placeholder="PPE-GLV-M" value={form.sku} onChange={(e) => set('sku', e.target.value)} /></FormField>
        <FormField label={t('common.category')}><Select options={CATS} value={form.category} onChange={(e) => set('category', e.target.value)} /></FormField>
        <FormField label={t('common.quantity')} required><Input type="number" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} /></FormField>
        <FormField label={t('common.unit')}><Input placeholder="box, piece, bottle..." value={form.unit} onChange={(e) => set('unit', e.target.value)} /></FormField>
        <FormField label={t('inventory.minStock')}><Input type="number" value={form.minStock} onChange={(e) => set('minStock', e.target.value)} /></FormField>
        <FormField label={t('inventory.unitPrice')} required><Input type="number" placeholder="0.00" value={form.price} onChange={(e) => set('price', e.target.value)} /></FormField>
        <FormField label={t('inventory.supplierName')}><Input placeholder="Supplier name" value={form.supplierName} onChange={(e) => set('supplierName', e.target.value)} /></FormField>
        <FormField label={t('inventory.location')}><Input placeholder="Cabinet A1" value={form.location} onChange={(e) => set('location', e.target.value)} /></FormField>
        <FormField label={t('inventory.expiryDate')}><Input type="date" value={form.expiryDate} onChange={(e) => set('expiryDate', e.target.value)} /></FormField>
      </div>
      <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-[var(--color-outline-variant)]/15">
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button onClick={handleSave} disabled={!form.name || !form.price}>{t('inventory.addItem')}</Button>
      </div>
    </Modal>
  )
}

export default function InventoryPage() {
  const { t } = useTranslation()
  const { items, suppliers, restockItem, addItem, deleteItem, getLowStockItems, getExpiredItems } = useInventoryStore()
  const [viewMode, setViewMode] = useState<ViewMode>('inventory')
  const [listMode, setListMode] = useState<ListMode>('table')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [restockTarget, setRestockTarget] = useState<InventoryItem | null>(null)
  const [showAddItem, setShowAddItem] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)

  const CATEGORY_OPTIONS = [
    { value: 'all', label: t('inventory.allCategories') },
    ...(['Consumables','Instruments','Medications','Protective Equipment','Impression Materials','Restorative','Sterilization','Equipment'] as InventoryCategory[]).map((c) => ({ value: c, label: c })),
  ]
  const STATUS_OPTIONS = [
    { value: 'all',          label: t('inventory.allStatuses') },
    { value: 'in-stock',     label: t('inventory.inStock') },
    { value: 'low-stock',    label: t('inventory.lowStock') },
    { value: 'out-of-stock', label: t('inventory.outOfStock') },
    { value: 'expired',      label: t('inventory.expired') },
  ]

  const lowStock = getLowStockItems()
  const expired = getExpiredItems()

  const filtered = items.filter((item) => {
    const matchCat = categoryFilter === 'all' || item.category === categoryFilter
    const matchStatus = statusFilter === 'all' || item.status === statusFilter
    const q = search.toLowerCase()
    const matchSearch = !q || [item.name, item.sku ?? '', item.category, item.supplierName ?? ''].some((v) => v.toLowerCase().includes(q))
    return matchCat && matchStatus && matchSearch
  })

  const columns: DataTableColumn<InventoryItem>[] = [
    { key: 'name',     header: t('inventory.itemName'), sortable: true, render: (item) => <div><p className="font-semibold text-sm text-[var(--color-on-surface)]">{item.name}</p>{item.sku && <p className="text-[11px] font-mono text-[var(--color-on-surface-variant)]">{item.sku}</p>}</div> },
    { key: 'category', header: t('common.category'),    sortable: true, render: (item) => <span className="px-2 py-0.5 bg-[var(--color-primary-container)]/15 text-[var(--color-primary)] text-[11px] font-semibold rounded-full">{item.category}</span> },
    { key: 'quantity', header: t('inventory.totalItems'), sortable: true, render: (item) => <div><p className="text-sm font-semibold text-[var(--color-on-surface)]">{item.quantity} <span className="font-normal text-[var(--color-on-surface-variant)]">{item.unit}</span></p><p className="text-[10px] text-[var(--color-on-surface-variant)]">{t('inventory.minStock')}: {item.minStock}</p></div> },
    { key: 'status',   header: t('common.status'),      sortable: true, render: (item) => <StockBadge status={item.status} /> },
    { key: 'expiry',   header: t('inventory.expiryDate'),render: (item) => <ExpiryIndicator expiryDate={item.expiryDate} /> },
    { key: 'price',    header: t('common.price'),        sortable: true, render: (item) => <span className="text-sm">{formatCurrency(item.price)}</span> },
    { key: 'supplier', header: t('inventory.supplierName'), render: (item) => <span className="text-xs text-[var(--color-on-surface-variant)]">{item.supplierName ?? '—'}</span> },
    { key: 'location', header: t('inventory.location'),  render: (item) => item.location ? <span className="text-xs font-mono text-[var(--color-on-surface-variant)]">{item.location}</span> : <span className="text-[var(--color-outline)]">—</span> },
  ]

  const actions: DataTableAction<InventoryItem>[] = [
    { label: t('inventory.restock'), icon: <RefreshCw size={13} />, onClick: (item) => setRestockTarget(item) },
    { label: t('common.delete'),     onClick: (item) => deleteItem(item.id), danger: true },
  ]

  const TABS = [
    { id: 'inventory' as ViewMode, label: `${t('nav.inventory')} (${items.length})` },
    { id: 'suppliers' as ViewMode, label: `${t('inventory.suppliers')} (${suppliers.length})` },
    { id: 'alerts'    as ViewMode, label: `${t('inventory.alerts')} (${lowStock.length + expired.length})`, badge: lowStock.length + expired.length },
  ]

  return (
    <div>
      <PageHeader
        title={t('inventory.title')}
        subtitle={t('inventory.subtitle')}
        breadcrumb={[{ label: t('nav.dashboard'), href: '/' }, { label: t('nav.inventory') }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" leftIcon={<Truck size={14} />}>{t('inventory.orderStock')}</Button>
            <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowAddItem(true)}>{t('inventory.addItem')}</Button>
          </div>
        }
      />

      <InventoryStats items={items} delay={0} className="mb-6" />

      <div className="flex items-center gap-1 bg-[var(--color-surface-container-low)] rounded-[var(--radius-lg)] p-1 mb-6 w-fit">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setViewMode(tab.id)}
            className={cn('flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-DEFAULT)] text-sm font-medium transition-all duration-200 whitespace-nowrap',
              viewMode === tab.id ? 'bg-[var(--color-surface-container-lowest)] text-[var(--color-primary)] shadow-[var(--shadow-card)]' : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]')}>
            {tab.label}
            {tab.badge && tab.badge > 0 && <span className="w-4 h-4 rounded-full bg-[var(--color-error)] text-white text-[9px] font-bold flex items-center justify-center">{tab.badge}</span>}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'inventory' && (
          <motion.div key="inventory" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <SectionCard noPadding>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-5 py-4 border-b border-[var(--color-outline-variant)]/20">
                <SearchBar value={search} onChange={setSearch} placeholder={t('inventory.searchPlaceholder')} className="w-full sm:max-w-xs" />
                <div className="flex items-center gap-2 ml-auto flex-wrap">
                  <Select options={CATEGORY_OPTIONS} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} fullWidth={false} className="text-xs py-1.5" />
                  <Select options={STATUS_OPTIONS} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} fullWidth={false} className="text-xs py-1.5" />
                  <div className="flex items-center bg-[var(--color-surface-container-low)] rounded-[var(--radius-DEFAULT)] p-0.5">
                    {(['table', 'grid'] as ListMode[]).map((m) => (
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
                    <DataTable columns={columns} data={filtered} actions={actions} searchable={false} externalSearch={search} pageSize={8} emptyTitle={t('inventory.noItems')} emptyDescription={t('inventory.adjustFilters')} emptyIcon={<Package size={28} />} />
                  </motion.div>
                ) : (
                  <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-5">
                    {filtered.length === 0 ? <EmptyState title={t('inventory.noItems')} description={t('inventory.adjustFilters')} icon={<Package size={28} />} /> : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filtered.map((item, i) => (
                          <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: i * 0.04 }} className="bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-lg)] border border-[var(--color-outline-variant)]/20 shadow-[var(--shadow-card)] p-4 hover:shadow-[var(--shadow-card-hover)] transition-all duration-200">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div><p className="font-semibold text-sm text-[var(--color-on-surface)] leading-tight">{item.name}</p>{item.sku && <p className="text-[10px] font-mono text-[var(--color-on-surface-variant)]">{item.sku}</p>}</div>
                              <StockBadge status={item.status} />
                            </div>
                            <div className="space-y-1.5 mb-3">
                              <p className="text-xs text-[var(--color-on-surface-variant)]"><span className="font-semibold text-[var(--color-on-surface)]">{item.quantity}</span> {item.unit} · {t('inventory.minStock')}: {item.minStock}</p>
                              {item.location && <p className="text-[11px] text-[var(--color-on-surface-variant)]">📍 {item.location}</p>}
                              <ExpiryIndicator expiryDate={item.expiryDate} />
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-[var(--color-outline-variant)]/15">
                              <span className="text-xs font-semibold text-[var(--color-secondary)]">{formatCurrency(item.price)}</span>
                              <Button variant="ghost" size="xs" leftIcon={<RefreshCw size={11} />} onClick={() => setRestockTarget(item)}>{t('inventory.restock')}</Button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </SectionCard>
          </motion.div>
        )}

        {viewMode === 'suppliers' && (
          <motion.div key="suppliers" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {suppliers.map((s, i) => <SupplierCard key={s.id} supplier={s} delay={i * 0.06} onClick={setSelectedSupplier} />)}
            </div>
          </motion.div>
        )}

        {viewMode === 'alerts' && (
          <motion.div key="alerts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-6">
                <SectionCard title={t('inventory.lowAndOutOfStock')} icon={<AlertTriangle size={15} />} subtitle={`${lowStock.length} ${t('inventory.itemsNeedAttention')}`} delay={0}>
                  {lowStock.length === 0 ? <p className="text-sm text-[var(--color-secondary)] text-center py-4 font-medium">✓ {t('inventory.allAdequate')}</p> : (
                    <div className="space-y-3">
                      {lowStock.map((item, i) => (
                        <motion.div key={item.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.22, delay: i * 0.05 }} className="flex items-center gap-3 p-3 bg-[var(--color-surface-container-low)] rounded-[var(--radius-DEFAULT)] border border-[var(--color-outline-variant)]/10">
                          <div className={cn('w-8 h-8 rounded-[var(--radius-DEFAULT)] flex items-center justify-center shrink-0', item.status === 'out-of-stock' ? 'bg-[var(--color-error-container)] text-[var(--color-error)]' : 'bg-amber-100 text-amber-600')}><Package size={14} /></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[var(--color-on-surface)] truncate">{item.name}</p>
                            <p className="text-[10px] text-[var(--color-on-surface-variant)]">{item.quantity} {item.unit} {t('inventory.remaining')} · {t('inventory.minStock')}: {item.minStock}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0"><StockBadge status={item.status} /><Button variant="ghost" size="xs" onClick={() => setRestockTarget(item)}><RefreshCw size={11} /></Button></div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>
              <div className="col-span-12 lg:col-span-6">
                <SectionCard title={t('inventory.expiredItems')} icon={<AlertTriangle size={15} />} subtitle={`${expired.length} ${t('inventory.itemsExpired')}`} delay={0.1}>
                  {expired.length === 0 ? <p className="text-sm text-[var(--color-secondary)] text-center py-4 font-medium">✓ {t('inventory.noExpiredItems')}</p> : (
                    <div className="space-y-3">
                      {expired.map((item, i) => (
                        <motion.div key={item.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.22, delay: 0.1 + i * 0.05 }} className="flex items-center gap-3 p-3 bg-[var(--color-surface-container-low)] rounded-[var(--radius-DEFAULT)] border border-[var(--color-outline-variant)]/10">
                          <div className="w-8 h-8 rounded-[var(--radius-DEFAULT)] bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] flex items-center justify-center shrink-0"><Package size={14} /></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[var(--color-on-surface)] truncate">{item.name}</p>
                            <p className="text-[10px] text-[var(--color-on-surface-variant)]">{item.quantity} {item.unit} · {item.location ?? t('inventory.noLocation')}</p>
                          </div>
                          <ExpiryIndicator expiryDate={item.expiryDate} />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <RestockModal item={restockTarget} open={!!restockTarget} onClose={() => setRestockTarget(null)} onRestock={restockItem} />
      <AddItemModal open={showAddItem} onClose={() => setShowAddItem(false)} onSave={addItem} />
      <Modal open={!!selectedSupplier} onClose={() => setSelectedSupplier(null)} title={selectedSupplier?.name} size="md">
        {selectedSupplier && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: t('inventory.contactPerson'), value: selectedSupplier.contactPerson ?? '—' },
                { label: t('common.category'),         value: selectedSupplier.category ?? '—' },
                { label: t('common.phone'),             value: selectedSupplier.phone ?? '—' },
                { label: t('common.email'),             value: selectedSupplier.email ?? '—' },
                { label: t('inventory.city'),           value: selectedSupplier.city ?? '—' },
                { label: t('inventory.totalOrders'),    value: String(selectedSupplier.totalOrders ?? 0) },
              ].map((item) => (
                <div key={item.label} className="bg-[var(--color-surface-container-low)] rounded-[var(--radius-DEFAULT)] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)] mb-0.5">{item.label}</p>
                  <p className="text-sm font-medium text-[var(--color-on-surface)]">{item.value}</p>
                </div>
              ))}
            </div>
            {selectedSupplier.notes && (
              <div className="bg-[var(--color-surface-container-low)] rounded-[var(--radius-DEFAULT)] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)] mb-1">{t('common.notes')}</p>
                <p className="text-sm text-[var(--color-on-surface-variant)]">{selectedSupplier.notes}</p>
              </div>
            )}
            <div className="flex justify-end"><Button size="sm" onClick={() => setSelectedSupplier(null)}>{t('common.close')}</Button></div>
          </div>
        )}
      </Modal>
    </div>
  )
}
