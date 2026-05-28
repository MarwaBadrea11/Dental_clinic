import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Stethoscope, Plus, LayoutGrid, List } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
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
import type { Treatment, TreatmentCategory } from '@/types'

export default function TreatmentsPage() {
  const { t } = useTranslation()
  const { treatments, deleteTreatment, addTreatment } = useTreatmentStore()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selected, setSelected] = useState<Treatment | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const CATEGORIES: { value: string; label: string }[] = [
    { value: 'all', label: t('treatments.allCategories') },
    ...(['Preventive','Restorative','Endodontic','Periodontic','Prosthodontic','Orthodontic','Oral Surgery','Cosmetic'] as TreatmentCategory[])
      .map((c) => ({ value: c, label: c })),
  ]

  const filtered = treatments.filter((tr) => {
    const matchCat = category === 'all' || tr.category === category
    const q = search.toLowerCase()
    const matchSearch = !q || tr.name.toLowerCase().includes(q) || tr.category.toLowerCase().includes(q)
    return matchCat && matchSearch
  })

  const grouped = filtered.reduce<Record<string, Treatment[]>>((acc, tr) => {
    if (!acc[tr.category]) acc[tr.category] = []
    acc[tr.category].push(tr)
    return acc
  }, {})

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
    { key: 'category',    header: t('common.category'),             sortable: true, render: (tr) => <ProcedureBadge category={tr.category} /> },
    { key: 'duration',    header: t('treatments.duration'),         sortable: true, render: (tr) => <span className="text-sm">{tr.duration} {t('treatments.minutes')}</span> },
    { key: 'price',       header: t('treatments.price'),            sortable: true, render: (tr) => <span className="text-sm font-semibold text-[var(--color-secondary)]">{formatCurrency(tr.price)}</span> },
    { key: 'description', header: t('treatments.description'),      render: (tr) => <span className="text-xs text-[var(--color-on-surface-variant)] line-clamp-1">{tr.description ?? '—'}</span> },
  ]

  const actions: DataTableAction<Treatment>[] = [
    { label: t('treatments.viewDetails'), onClick: (tr) => setSelected(tr) },
    { label: t('common.delete'),          onClick: (tr) => deleteTreatment(tr.id), danger: true },
  ]

  return (
    <div>
      <PageHeader
        title={t('treatments.title')}
        subtitle={`${treatments.length} ${t('treatments.subtitle')}`}
        breadcrumb={[{ label: t('nav.dashboard'), href: '/' }, { label: t('nav.treatments') }]}
        actions={<Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setAddOpen(true)}>{t('treatments.addTreatment')}</Button>}
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}
        className="treatments-stats-grid"
      >
        {[
          { label: t('nav.treatments'),      value: treatments.length,                                                                                                    color: 'text-[var(--color-primary)]' },
          { label: t('treatments.avgDuration'),value: `${Math.round(treatments.reduce((s, tr) => s + tr.duration, 0) / treatments.length)}${t('treatments.minutes')}`,   color: 'text-[var(--color-secondary)]' },
          { label: t('treatments.avgPrice'),   value: formatCurrency(treatments.reduce((s, tr) => s + tr.price, 0) / treatments.length),                                 color: 'text-[var(--color-tertiary)]' },
          { label: t('treatments.categories'), value: new Set(treatments.map((tr) => tr.category)).size,                                                                  color: 'text-amber-600' },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-lg)] border border-[var(--color-outline-variant)]/20 shadow-[var(--shadow-card)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </motion.div>

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
          {viewMode === 'grid' ? (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-5">
              {Object.keys(grouped).length === 0 ? (
                <div className="py-12 text-center text-sm text-[var(--color-on-surface-variant)]">{t('treatments.noTreatments')}</div>
              ) : (
                Object.entries(grouped).map(([cat, items]) => (
                  <div key={cat} className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <ProcedureBadge category={cat as TreatmentCategory} size="md" />
                      <span className="text-xs text-[var(--color-on-surface-variant)]">
                        {items.length} {items.length > 1 ? t('treatments.procedures') : t('treatments.procedure')}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '1rem' }} className="treatments-card-grid">
                      {items.map((tr, i) => <TreatmentCard key={tr.id} treatment={tr} onClick={setSelected} delay={i * 0.04} />)}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <DataTable columns={columns} data={filtered} actions={actions} searchable={false} externalSearch={search} pageSize={10} emptyTitle={t('treatments.noTreatments')} emptyIcon={<Stethoscope size={28} />} onRowClick={setSelected} />
            </motion.div>
          )}
        </AnimatePresence>
      </SectionCard>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name} size="md">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-[var(--radius-lg)] flex items-center justify-center text-3xl" style={{ background: `${selected.color}20`, border: `1px solid ${selected.color}30` }}>
                {selected.icon ?? '🦷'}
              </div>
              <div>
                <ProcedureBadge category={selected.category} size="md" />
                <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">{selected.description}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
            {selected.steps && selected.steps.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)] mb-2">{t('treatments.steps')}</p>
                <ol className="space-y-1">
                  {selected.steps.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-on-surface)]">
                      <span className="w-5 h-5 rounded-full bg-[var(--color-primary-container)]/20 text-[var(--color-primary)] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={() => setSelected(null)}>{t('common.close')}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Treatment Modal */}
      <TreatmentFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={(data) => {
          addTreatment({ ...data, id: `t${Date.now()}` })
          setAddOpen(false)
        }}
      />
    </div>
  )
}
