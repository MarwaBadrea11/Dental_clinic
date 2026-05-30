import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Package, Plus, List, LayoutGrid, AlertTriangle, RefreshCw, Pencil, Trash2 } from 'lucide-react'
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
import { StockBadge, ExpiryIndicator, InventoryStats } from '@/components/inventory'
import { useInventoryStore } from '@/store/inventoryStore'
import { formatCurrency } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { InventoryItem, InventoryCategory } from '@/types'
import type { CreateInventoryPayload } from '@/services/inventoryService'

type ViewMode = 'inventory' | 'alerts'
type ListMode = 'table' | 'grid'

const CATEGORIES: InventoryCategory[] = [
  'Consumables', 'Instruments', 'Medications', 'Protective Equipment',
  'Impression Materials', 'Restorative', 'Sterilization', 'Equipment',
]

// ── Restock Modal ─────────────────────────────────────────────────────────────

function RestockModal({
  item, open, onClose, onRestock,
}: {
  item: InventoryItem | null
  open: boolean
  onClose: () => void
  onRestock: (id: string, qty: number) => Promise<void>
}) {
  const { t } = useTranslation()
  const [qty, setQty] = useState('10')
  const [saving, setSaving] = useState(false)

  if (!item) return null

  const handleConfirm = async () => {
    const n = parseInt(qty)
    if (!n || n < 1) return
    setSaving(true)
    try {
      await onRestock(item.id, n)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`${t('inventory.restock')} — ${item.name}`} size="sm">
      <div className="space-y-4">
        <div className="bg-[var(--color-surface-container-low)] rounded-[var(--radius-DEFAULT)] p-3 text-sm">
          <p className="text-[var(--color-on-surface-variant)]">
            {t('inventory.currentStock')}: <span className="font-bold text-[var(--color-on-surface)]">{item.quantity} {item.unit}</span>
          </p>
          <p className="text-[var(--color-on-surface-variant)]">
            {t('inventory.minStockLabel')}: <span className="font-bold text-[var(--color-on-surface)]">{item.minStock} {item.unit}</span>
          </p>
        </div>
        <FormField label={t('inventory.quantityToAdd')} required>
          <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} min="1" />
        </FormField>
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
          <Button size="sm" loading={saving} leftIcon={<RefreshCw size={13} />} onClick={handleConfirm}>
            {t('inventory.confirmRestock')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Add / Edit Item Modal ─────────────────────────────────────────────────────

interface ItemFormState {
  material_name: string
  category: InventoryCategory
  quantity: string
  unit: string
  min_stock_alert: string
  unit_price: string
  supplier_info: string
  expiry_date: string
}

const EMPTY_FORM: ItemFormState = {
  material_name: '',
  category: 'Consumables',
  quantity: '0',
  unit: 'piece',
  min_stock_alert: '5',
  unit_price: '',
  supplier_info: '',
  expiry_date: '',
}

function ItemModal({
  open, onClose, onSave, editItem,
}: {
  open: boolean
  onClose: () => void
  onSave: (payload: CreateInventoryPayload) => Promise<void>
  editItem?: InventoryItem | null
}) {
  const { t } = useTranslation()
  const [form, setForm] = useState<ItemFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<ItemFormState>>({})

  useEffect(() => {
    if (open) {
      if (editItem) {
        setForm({
          material_name: editItem.name,
          category: editItem.category,
          quantity: String(editItem.quantity),
          unit: editItem.unit,
          min_stock_alert: String(editItem.minStock),
          unit_price: String(editItem.price),
          supplier_info: editItem.supplierName ?? '',
          expiry_date: editItem.expiryDate ?? '',
        })
      } else {
        setForm(EMPTY_FORM)
      }
      setErrors({})
    }
  }, [open, editItem])

  const set = (k: keyof ItemFormState, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const validate = (): boolean => {
    const e: Partial<ItemFormState> = {}
    if (!form.material_name.trim()) e.material_name = 'Required'
    if (!form.unit_price || isNaN(Number(form.unit_price))) e.unit_price = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      await onSave({
        material_name: form.material_name.trim(),
        category: form.category,
        quantity: parseInt(form.quantity) || 0,
        unit: form.unit || 'piece',
        min_stock_alert: parseInt(form.min_stock_alert) || 5,
        unit_price: parseFloat(form.unit_price) || 0,
        supplier_info: form.supplier_info.trim() || null,
        expiry_date: form.expiry_date || null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const CATS = CATEGORIES.map((c) => ({ value: c, label: c }))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editItem ? t('inventory.editItem') : t('inventory.addItemTitle')}
      size="lg"
    >
      <div className="grid grid-cols-2 gap-4">
        <FormField label={t('inventory.itemName')} required error={errors.material_name} className="col-span-2">
          <Input
            placeholder="Nitrile Gloves (M)"
            value={form.material_name}
            onChange={(e) => set('material_name', e.target.value)}
          />
        </FormField>
        <FormField label={t('common.category')}>
          <Select options={CATS} value={form.category} onChange={(e) => set('category', e.target.value as InventoryCategory)} />
        </FormField>
        <FormField label={t('common.unit')}>
          <Input placeholder="box, piece, bottle..." value={form.unit} onChange={(e) => set('unit', e.target.value)} />
        </FormField>
        <FormField label={t('common.quantity')} required>
          <Input type="number" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} />
        </FormField>
        <FormField label={t('inventory.minStock')}>
          <Input type="number" value={form.min_stock_alert} onChange={(e) => set('min_stock_alert', e.target.value)} />
        </FormField>
        <FormField label={t('inventory.unitPrice')} required error={errors.unit_price}>
          <Input type="number" placeholder="0.00" value={form.unit_price} onChange={(e) => set('unit_price', e.target.value)} />
        </FormField>
        <FormField label={t('inventory.expiryDate')}>
          <Input type="date" value={form.expiry_date} onChange={(e) => set('expiry_date', e.target.value)} />
        </FormField>
        <FormField label={t('inventory.supplierName')} className="col-span-2">
          <Input placeholder="Supplier name or contact info" value={form.supplier_info} onChange={(e) => set('supplier_info', e.target.value)} />
        </FormField>
      </div>
      <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-[var(--color-outline-variant)]/15">
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button onClick={handleSave} loading={saving}>
          {editItem ? t('common.save') : t('inventory.addItem')}
        </Button>
      </div>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const { t } = useTranslation()
  const { items, loading, loadInventory, addItem, editItem, restockItem, deleteItem, getLowStockItems, getExpiredItems } = useInventoryStore()

  const [viewMode, setViewMode] = useState<ViewMode>('inventory')
  const [listMode, setListMode] = useState<ListMode>('table')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [restockTarget, setRestockTarget] = useState<InventoryItem | null>(null)
  const [showItemModal, setShowItemModal] = useState(false)
  const [editTarget, setEditTarget] = useState<InventoryItem | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { loadInventory() }, [])

  const CATEGORY_OPTIONS = [
    { value: 'all', label: t('inventory.allCategories') },
    ...CATEGORIES.map((c) => ({ value: c, label: c })),
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
    const matchSearch = !q || [item.name, item.category, item.supplierName ?? ''].some((v) => v.toLowerCase().includes(q))
    return matchCat && matchStatus && matchSearch
  })

  const handleSaveItem = async (payload: CreateInventoryPayload) => {
    if (editTarget) {
      await editItem(editTarget.id, payload)
    } else {
      await addItem(payload)
    }
  }

  const handleDelete = async (item: InventoryItem) => {
    if (!confirm(`Delete "${item.name}"?`)) return
    setDeletingId(item.id)
    try {
      await deleteItem(item.id)
    } catch {
      alert('Failed to delete item. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  const columns: DataTableColumn<InventoryItem>[] = [
    {
      key: 'name', header: t('inventory.itemName'), sortable: true,
      render: (item) => (
        <div>
          <p className="font-semibold text-sm text-[var(--color-on-surface)]">{item.name}</p>
          {item.supplierName && (
            <p className="text-[11px] text-[var(--color-on-surface-variant)]">{item.supplierName}</p>
          )}
        </div>
      ),
    },
    {
      key: 'category', header: t('common.category'), sortable: true,
      render: (item) => (
        <span className="px-2 py-0.5 bg-[var(--color-primary-container)]/15 text-[var(--color-primary)] text-[11px] font-semibold rounded-full">
          {item.category}
        </span>
      ),
    },
    {
      key: 'quantity', header: t('inventory.totalItems'), sortable: true,
      render: (item) => (
        <div>
          <p className="text-sm font-semibold text-[var(--color-on-surface)]">
            {item.quantity} <span className="font-normal text-[var(--color-on-surface-variant)]">{item.unit}</span>
          </p>
          <p className="text-[10px] text-[var(--color-on-surface-variant)]">{t('inventory.minStock')}: {item.minStock}</p>
        </div>
      ),
    },
    {
      key: 'status', header: t('common.status'), sortable: true,
      render: (item) => <StockBadge status={item.status} />,
    },
    {
      key: 'expiry', header: t('inventory.expiryDate'),
      render: (item) => <ExpiryIndicator expiryDate={item.expiryDate} />,
    },
    {
      key: 'price', header: t('common.price'), sortable: true,
      render: (item) => <span className="text-sm">{formatCurrency(item.price)}</span>,
    },
  ]

  const actions: DataTableAction<InventoryItem>[] = [
    {
      label: t('inventory.restock'),
      icon: <RefreshCw size={13} />,
      onClick: (item) => setRestockTarget(item),
    },
    {
      label: t('common.edit'),
      icon: <Pencil size={13} />,
      onClick: (item) => { setEditTarget(item); setShowItemModal(true) },
    },
    {
      label: t('common.delete'),
      icon: <Trash2 size={13} />,
      danger: true,
      onClick: handleDelete,
    },
  ]

  const TABS = [
    { id: 'inventory' as ViewMode, label: `${t('nav.inventory')} (${items.length})` },
    { id: 'alerts' as ViewMode, label: `${t('inventory.alerts')} (${lowStock.length + expired.length})`, badge: lowStock.length + expired.length },
  ]

  return (
    <div>
      <PageHeader
        title={t('inventory.title')}
        subtitle={t('inventory.subtitle')}
        breadcrumb={[{ label: t('nav.dashboard'), href: '/' }, { label: t('nav.inventory') }]}
        actions={
          <Button
            size="sm"
            leftIcon={<Plus size={14} />}
            onClick={() => { setEditTarget(null); setShowItemModal(true) }}
          >
            {t('inventory.addItem')}
          </Button>
        }
      />

      <InventoryStats items={items} delay={0} className="mb-6" />

      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-[var(--color-surface-container-low)] rounded-[var(--radius-lg)] p-1 mb-6 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setViewMode(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-DEFAULT)] text-sm font-medium transition-all duration-200 whitespace-nowrap',
              viewMode === tab.id
                ? 'bg-[var(--color-surface-container-lowest)] text-[var(--color-primary)] shadow-[var(--shadow-card)]'
                : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'
            )}
          >
            {tab.label}
            {tab.badge && tab.badge > 0 && (
              <span className="w-4 h-4 rounded-full bg-[var(--color-error)] text-white text-[9px] font-bold flex items-center justify-center">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Inventory Tab ── */}
        {viewMode === 'inventory' && (
          <motion.div key="inventory" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <SectionCard noPadding>
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-5 py-4 border-b border-[var(--color-outline-variant)]/20">
                <SearchBar
                  value={search}
                  onChange={setSearch}
                  placeholder={t('inventory.searchPlaceholder')}
                  className="w-full sm:max-w-xs"
                />
                <div className="flex items-center gap-2 ml-auto flex-wrap">
                  <Select
                    options={CATEGORY_OPTIONS}
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    fullWidth={false}
                    className="text-xs py-1.5"
                  />
                  <Select
                    options={STATUS_OPTIONS}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    fullWidth={false}
                    className="text-xs py-1.5"
                  />
                  <div className="flex items-center bg-[var(--color-surface-container-low)] rounded-[var(--radius-DEFAULT)] p-0.5">
                    {(['table', 'grid'] as ListMode[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => setListMode(m)}
                        className={cn(
                          'p-1.5 rounded transition-colors',
                          listMode === m ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-on-surface-variant)]'
                        )}
                      >
                        {m === 'table' ? <List size={15} /> : <LayoutGrid size={15} />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {listMode === 'table' ? (
                  <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <DataTable
                      columns={columns}
                      data={filtered}
                      actions={actions}
                      loading={loading}
                      searchable={false}
                      externalSearch={search}
                      pageSize={10}
                      emptyTitle={t('inventory.noItems')}
                      emptyDescription={t('inventory.adjustFilters')}
                      emptyIcon={<Package size={28} />}
                    />
                  </motion.div>
                ) : (
                  <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-5">
                    {filtered.length === 0 ? (
                      <EmptyState title={t('inventory.noItems')} description={t('inventory.adjustFilters')} icon={<Package size={28} />} />
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filtered.map((item, i) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, delay: i * 0.04 }}
                            className="bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-lg)] border border-[var(--color-outline-variant)]/20 shadow-[var(--shadow-card)] p-4 hover:shadow-[var(--shadow-card-hover)] transition-all duration-200"
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <p className="font-semibold text-sm text-[var(--color-on-surface)] leading-tight">{item.name}</p>
                                {item.supplierName && (
                                  <p className="text-[10px] text-[var(--color-on-surface-variant)]">{item.supplierName}</p>
                                )}
                              </div>
                              <StockBadge status={item.status} />
                            </div>
                            <div className="space-y-1.5 mb-3">
                              <p className="text-xs text-[var(--color-on-surface-variant)]">
                                <span className="font-semibold text-[var(--color-on-surface)]">{item.quantity}</span> {item.unit} · {t('inventory.minStock')}: {item.minStock}
                              </p>
                              <ExpiryIndicator expiryDate={item.expiryDate} />
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-[var(--color-outline-variant)]/15">
                              <span className="text-xs font-semibold text-[var(--color-secondary)]">{formatCurrency(item.price)}</span>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  leftIcon={<Pencil size={11} />}
                                  onClick={() => { setEditTarget(item); setShowItemModal(true) }}
                                />
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  leftIcon={<RefreshCw size={11} />}
                                  onClick={() => setRestockTarget(item)}
                                />
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  leftIcon={<Trash2 size={11} />}
                                  onClick={() => handleDelete(item)}
                                  loading={deletingId === item.id}
                                  className="text-[var(--color-error)] hover:bg-[var(--color-error-container)]"
                                />
                              </div>
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

        {/* ── Alerts Tab ── */}
        {viewMode === 'alerts' && (
          <motion.div key="alerts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-12 gap-6">
              {/* Low / Out of Stock */}
              <div className="col-span-12 lg:col-span-6">
                <SectionCard
                  title={t('inventory.lowAndOutOfStock')}
                  icon={<AlertTriangle size={15} />}
                  subtitle={`${lowStock.length} ${t('inventory.itemsNeedAttention')}`}
                  delay={0}
                >
                  {lowStock.length === 0 ? (
                    <p className="text-sm text-[var(--color-secondary)] text-center py-4 font-medium">✓ {t('inventory.allAdequate')}</p>
                  ) : (
                    <div className="space-y-3">
                      {lowStock.map((item, i) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.22, delay: i * 0.05 }}
                          className="flex items-center gap-3 p-3 bg-[var(--color-surface-container-low)] rounded-[var(--radius-DEFAULT)] border border-[var(--color-outline-variant)]/10"
                        >
                          <div className={cn(
                            'w-8 h-8 rounded-[var(--radius-DEFAULT)] flex items-center justify-center shrink-0',
                            item.status === 'out-of-stock'
                              ? 'bg-[var(--color-error-container)] text-[var(--color-error)]'
                              : 'bg-amber-100 text-amber-600'
                          )}>
                            <Package size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[var(--color-on-surface)] truncate">{item.name}</p>
                            <p className="text-[10px] text-[var(--color-on-surface-variant)]">
                              {item.quantity} {item.unit} {t('inventory.remaining')} · {t('inventory.minStock')}: {item.minStock}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <StockBadge status={item.status} />
                            <Button variant="ghost" size="xs" onClick={() => setRestockTarget(item)}>
                              <RefreshCw size={11} />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>

              {/* Expired */}
              <div className="col-span-12 lg:col-span-6">
                <SectionCard
                  title={t('inventory.expiredItems')}
                  icon={<AlertTriangle size={15} />}
                  subtitle={`${expired.length} ${t('inventory.itemsExpired')}`}
                  delay={0.1}
                >
                  {expired.length === 0 ? (
                    <p className="text-sm text-[var(--color-secondary)] text-center py-4 font-medium">✓ {t('inventory.noExpiredItems')}</p>
                  ) : (
                    <div className="space-y-3">
                      {expired.map((item, i) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.22, delay: 0.1 + i * 0.05 }}
                          className="flex items-center gap-3 p-3 bg-[var(--color-surface-container-low)] rounded-[var(--radius-DEFAULT)] border border-[var(--color-outline-variant)]/10"
                        >
                          <div className="w-8 h-8 rounded-[var(--radius-DEFAULT)] bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] flex items-center justify-center shrink-0">
                            <Package size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[var(--color-on-surface)] truncate">{item.name}</p>
                            <p className="text-[10px] text-[var(--color-on-surface-variant)]">
                              {item.quantity} {item.unit}
                            </p>
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

      {/* Modals */}
      <RestockModal
        item={restockTarget}
        open={!!restockTarget}
        onClose={() => setRestockTarget(null)}
        onRestock={restockItem}
      />
      <ItemModal
        open={showItemModal}
        onClose={() => { setShowItemModal(false); setEditTarget(null) }}
        onSave={handleSaveItem}
        editItem={editTarget}
      />
    </div>
  )
}
