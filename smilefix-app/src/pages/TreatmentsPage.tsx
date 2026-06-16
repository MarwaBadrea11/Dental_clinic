import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Stethoscope, Plus, LayoutGrid, List, Clock, DollarSign, Layers } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageStatsGrid } from '@/components/shared/PageStatsGrid'
import { SectionCard } from '@/components/ui/SectionCard'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { DataTable, type DataTableColumn, type DataTableAction } from '@/components/ui/DataTable'
import { TreatmentCard, ProcedureBadge, TreatmentFormModal } from '@/components/treatments'
import { useTreatmentStore } from '@/store/treatmentStore'
import { formatCurrency } from '@/utils/format'
import { cn } from '@/utils/cn'
import { buildTreatmentCategorySelectOptionsWithApiValues } from '@/i18n/treatmentCategoryOptions'
import type { Treatment } from '@/types'

export default function TreatmentsPage() {
  const { t } = useTranslation()
  const {
    treatments,
    treatmentsLoading,
    treatmentsError,
    loadTreatments,
    saveTreatment,
    editTreatment,
    removeTreatment,
  } = useTreatmentStore()

  const [search, setSearch]       = useState('')
  const [category, setCategory]   = useState('all')
  const [viewMode, setViewMode]   = useState<'grid' | 'list'>('grid')
  const [selected, setSelected]   = useState<Treatment | null>(null)

  // Add modal
  const [addOpen, setAddOpen]     = useState(false)

  // Edit modal
  const [editTarget, setEditTarget] = useState<Treatment | null>(null)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Treatment | null>(null)
  const [deleting, setDeleting]         = useState(false)
  const [deleteError, setDeleteError]   = useState<string | null>(null)

  // Load catalogue from the backend on mount
  useEffect(() => {
    loadTreatments()
  }, [loadTreatments])

  const CATEGORIES = buildTreatmentCategorySelectOptionsWithApiValues(
    t,
    treatments.map((tr) => tr.category),
    { includeAll: true },
  )

  const filtered = treatments.filter((tr) => {
    const matchCat = category === 'all' || tr.category === category
    const q = search.toLowerCase()
    const matchSearch = !q || [
      tr.name,
      tr.category,
      tr.description,
    ].some((v) => v?.toLowerCase().includes(q))
    return matchCat && matchSearch
  })

  const grouped = filtered.reduce<Record<string, Treatment[]>>((acc, tr) => {
    if (!acc[tr.category]) acc[tr.category] = []
    acc[tr.category].push(tr)
    return acc
  }, {})

  // ── Handlers ────────────────────────────────────────────────────────────────

  /** Called by the Add modal — throws on failure so the modal stays open */
  const handleAdd = async (data: Omit<Treatment, 'id'>) => {
    await saveTreatment(data)
  }

  /** Called by the Edit modal — throws on failure so the modal stays open */
  const handleEdit = async (data: Omit<Treatment, 'id'>) => {
    if (!editTarget) return
    await editTreatment(editTarget.id, data)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await removeTreatment(deleteTarget.id)
      setDeleteTarget(null)
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete treatment')
    } finally {
      setDeleting(false)
    }
  }

  // ── Table config ─────────────────────────────────────────────────────────────

  const columns: DataTableColumn<Treatment>[] = [
    {
      key: 'name', header: t('nav.treatments'), sortable: true,
      render: (tr) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[var(--radius-DEFAULT)] flex items-center justify-center text-base" style={{ background: `${tr.color}20` }}>
            {tr.icon ?? '🦷'}
          </div>
          <p className="font-semibold text-sm">{tr.name}</p>
        </div>
      ),
    },
    { key: 'category',    header: t('common.category'),        sortable: true, render: (tr) => <ProcedureBadge category={tr.category} /> },
    { key: 'duration',    header: t('treatments.duration'),    sortable: true, render: (tr) => <span className="text-sm">{tr.duration} {t('treatments.minutes')}</span> },
    { key: 'price',       header: t('treatments.price'),       sortable: true, render: (tr) => <span className="text-sm font-semibold text-[var(--color-secondary)]">{formatCurrency(tr.price)}</span> },
    { key: 'description', header: t('treatments.description'), render: (tr) => <span className="text-xs text-[var(--color-on-surface-variant)] line-clamp-1">{tr.description ?? '—'}</span> },
  ]

  const actions: DataTableAction<Treatment>[] = [
    { label: t('treatments.viewDetails'), onClick: (tr) => setSelected(tr) },
    { label: t('common.edit') ?? 'Edit',  onClick: (tr) => setEditTarget(tr) },
    { label: t('common.delete'),          onClick: (tr) => setDeleteTarget(tr), danger: true },
  ]

  // ── Stats ────────────────────────────────────────────────────────────────────

  const avgDuration = treatments.length
    ? Math.round(treatments.reduce((s, tr) => s + tr.duration, 0) / treatments.length)
    : 0
  const avgPrice = treatments.length
    ? treatments.reduce((s, tr) => s + tr.price, 0) / treatments.length
    : 0
  const categoryCount = new Set(treatments.map((tr) => tr.category)).size

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title={t('treatments.title')}
        subtitle={`${treatments.length} ${t('treatments.subtitle')}`}
        breadcrumb={[{ label: t('nav.dashboard'), href: '/' }, { label: t('nav.treatments') }]}
        actions={
          <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setAddOpen(true)}>
            {t('treatments.addTreatment')}
          </Button>
        }
      />

      <PageStatsGrid
        className="treatments-stats-grid mb-6"
        stats={[
          {
            label: t('nav.treatments'),
            value: treatments.length,
            icon: <Stethoscope size={18} />,
            color: 'text-[var(--color-primary)]',
            bg:    'bg-[var(--color-primary-container)]/20',
          },
          {
            label: t('treatments.avgDuration'),
            value: `${avgDuration}${t('treatments.minutes')}`,
            icon: <Clock size={18} />,
            color: 'text-[var(--color-secondary)]',
            bg:    'bg-[var(--color-secondary-container)]/20',
          },
          {
            label: t('treatments.avgPrice'),
            value: formatCurrency(avgPrice),
            icon: <DollarSign size={18} />,
            color: 'text-[var(--color-tertiary)]',
            bg:    'bg-[var(--color-tertiary-container)]/20',
          },
          {
            label: t('treatments.categories'),
            value: categoryCount,
            icon: <Layers size={18} />,
            color: 'text-[var(--color-on-surface-variant)]',
            bg:    'bg-[var(--color-surface-container-high)]',
          },
        ]}
      />

      {/* Main card */}
      <SectionCard noPadding>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-5 py-4 border-b border-[var(--color-outline-variant)]/20">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={t('treatments.searchPlaceholder') ?? 'Search treatments by name, code, or category…'}
            maxWidth="26rem"
          />
          <div className="flex items-center gap-2 ml-auto">
            <Select options={CATEGORIES} value={category} onChange={(e) => setCategory(e.target.value)} fullWidth={false} className="text-xs py-1.5" />
            <div className="flex items-center bg-[var(--color-surface-container-low)] rounded-[var(--radius-DEFAULT)] p-0.5">
              {(['grid', 'list'] as const).map((m) => (
                <button key={m} onClick={() => setViewMode(m)}
                  className={cn('p-1.5 rounded transition-colors', viewMode === m ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-on-surface-variant)]')}>
                  {m === 'grid' ? <LayoutGrid size={15} /> : <List size={15} />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {treatmentsLoading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="py-16 text-center text-sm text-[var(--color-on-surface-variant)]">
              Loading treatments…
            </motion.div>
          ) : treatmentsError ? (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="py-16 text-center text-sm text-red-500">
              {treatmentsError}
              <button onClick={loadTreatments} className="ml-2 underline">Retry</button>
            </motion.div>
          ) : viewMode === 'grid' ? (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-5">
              {Object.keys(grouped).length === 0 ? (
                <div className="py-12 text-center text-sm text-[var(--color-on-surface-variant)]">{t('treatments.noTreatments')}</div>
              ) : (
                Object.entries(grouped).map(([cat, items]) => (
                  <div key={cat} className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <ProcedureBadge category={cat} size="md" />
                      <span className="text-xs text-[var(--color-on-surface-variant)]">
                        {items.length} {items.length > 1 ? t('treatments.procedures') : t('treatments.procedure')}
                      </span>
                    </div>
                    <div className="treatments-card-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {items.map((tr, i) => (
                        <TreatmentCard
                          key={tr.id}
                          treatment={tr}
                          onClick={setSelected}
                          delay={i * 0.04}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <DataTable
                columns={columns}
                data={filtered}
                actions={actions}
                searchable={false}
                externalSearch={search}
                pageSize={10}
                emptyTitle={t('treatments.noTreatments')}
                emptyIcon={<Stethoscope size={28} />}
                onRowClick={setSelected}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </SectionCard>

      {/* ── Detail modal ──────────────────────────────────────────────────────── */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name} size="md">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-[var(--radius-lg)] flex items-center justify-center text-3xl"
                style={{ background: `${selected.color}20`, border: `1px solid ${selected.color}30` }}>
                {selected.icon ?? '🦷'}
              </div>
              <div>
                <ProcedureBadge category={selected.category} size="md" />
                <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">{selected.description}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: t('treatments.duration'), value: `${selected.duration} ${t('treatments.minutes')}` },
                { label: t('treatments.price'),    value: formatCurrency(selected.price) },
              ].map((item) => (
                <div key={item.label} className="bg-[var(--color-surface-container-low)] rounded-[var(--radius-DEFAULT)] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)] mb-1">{item.label}</p>
                  <p className="text-sm font-bold text-[var(--color-on-surface)]">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="ghost" onClick={() => { setSelected(null); setEditTarget(selected) }}>
                {t('common.edit') ?? 'Edit'}
              </Button>
              <Button size="sm" onClick={() => setSelected(null)}>{t('common.close')}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Add modal ─────────────────────────────────────────────────────────── */}
      <TreatmentFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleAdd}
      />

      {/* ── Edit modal ────────────────────────────────────────────────────────── */}
      <TreatmentFormModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleEdit}
        initialData={editTarget ?? undefined}
      />

      {/* ── Delete confirmation modal ─────────────────────────────────────────── */}
      <Modal
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(null) }}
        title={t('common.confirmDelete') ?? 'Delete Treatment'}
        size="sm"
      >
        <p className="text-sm text-[var(--color-on-surface-variant)]">
          Are you sure you want to remove <strong>{deleteTarget?.name}</strong> from the catalogue? This action cannot be undone.
        </p>

        {deleteError && (
          <div className="mt-3 px-3 py-2 rounded-[var(--radius-DEFAULT)] bg-red-50 border border-red-200 text-red-700 text-sm">
            {deleteError}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-[var(--color-outline-variant)]/15">
          <Button variant="ghost" onClick={() => { setDeleteTarget(null); setDeleteError(null) }} disabled={deleting}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={handleDeleteConfirm} loading={deleting}>
            {t('common.delete')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
