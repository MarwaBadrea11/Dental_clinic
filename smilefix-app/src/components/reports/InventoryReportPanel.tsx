import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Package, AlertTriangle, FileText, Table2 } from 'lucide-react'
import { SectionCard } from '@/components/ui/SectionCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ReportTable, type ReportColumn } from './ReportTable'
import { TableSearch } from './ReportFilters'
import { useReportStore } from '@/store/reportStore'
import { formatCurrency } from '@/utils/format'
import type { InventoryItem } from '@/services/reportService'

export function InventoryReportPanel() {
  const { t } = useTranslation()
  const { inventory, inventoryLoading, inventoryError, exportLoading, exportError, loadInventory, exportReport } = useReportStore()
  const [search, setSearch]           = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)

  useEffect(() => { loadInventory({ lowStockOnly }) }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = (inventory?.items ?? []).filter((i) =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) || (i.sku ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const columns: ReportColumn<InventoryItem>[] = [
    { key: 'name',        header: t('reports.item') },
    { key: 'sku',         header: t('reports.sku'),      render: (r) => r.sku ?? '—' },
    { key: 'category',    header: t('common.category'), render: (r) => r.category ?? '—' },
    { key: 'quantity',    header: t('reports.qty'),      align: 'right' },
    { key: 'unit',        header: t('common.unit') },
    { key: 'unit_cost',   header: t('reports.unitCost'),   align: 'right', render: (r) => formatCurrency(Number(r.unit_cost)) },
    { key: 'stock_value', header: t('reports.stockValue'), align: 'right', render: (r) => formatCurrency(Number(r.stock_value)) },
    {
      key: 'is_low_stock', header: t('common.status'),
      render: (r) => r.is_low_stock
        ? <Badge variant="error" dot>{t('reports.lowStock')}</Badge>
        : <Badge variant="success" dot>{t('reports.stockOk')}</Badge>,
    },
  ]

  const s = inventory?.summary

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <TableSearch value={search} onChange={setSearch} placeholder={t('reports.searchItems')} className="w-52" />
          <label className="flex items-center gap-2 text-sm text-[var(--color-on-surface)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => { setLowStockOnly(e.target.checked); loadInventory({ lowStockOnly: e.target.checked }) }}
              className="accent-[var(--color-primary)]"
            />
            {t('reports.lowStockOnly')}
          </label>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" leftIcon={<FileText size={13} />} loading={exportLoading}
            onClick={() => exportReport('inventory', 'pdf', { lowStockOnly: lowStockOnly ? 'true' : undefined })}>
            {t('reports.exportPdf')}
          </Button>
          <Button variant="secondary" size="sm" leftIcon={<Table2 size={13} />} loading={exportLoading}
            onClick={() => exportReport('inventory', 'xlsx', { lowStockOnly: lowStockOnly ? 'true' : undefined })}>
            {t('reports.exportExcel')}
          </Button>
        </div>
      </div>

      {inventoryError && (
        <div className="flex items-center gap-2 p-3 rounded-[var(--radius-DEFAULT)] bg-[var(--color-error-container)]/20 text-[var(--color-error)] text-sm">
          <AlertTriangle size={15} /> {inventoryError}
        </div>
      )}
      {exportError && (
        <div className="flex items-center gap-2 p-3 rounded-[var(--radius-DEFAULT)] bg-[var(--color-error-container)]/20 text-[var(--color-error)] text-sm">
          <AlertTriangle size={15} /> {t('reports.exportFailed', { error: exportError })}
        </div>
      )}

      {s && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: t('reports.totalItems'),  value: s.total_items },
            { label: t('reports.stockValue'),  value: formatCurrency(Number(s.total_stock_value ?? 0)) },
            { label: t('reports.lowStock'),    value: s.low_stock_count },
            { label: t('reports.outOfStock'),  value: s.out_of_stock_count },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-lg)] border border-[var(--color-outline-variant)]/20 shadow-[var(--shadow-card)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{kpi.label}</p>
              <p className="text-xl font-bold text-[var(--color-on-surface)] mt-1">{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      <SectionCard title={t('reports.inventoryItems')} icon={<Package size={15} />} subtitle={t('reports.itemsCount', { count: filtered.length })} delay={0.05}>
        <ReportTable<InventoryItem>
          columns={columns}
          rows={filtered}
          keyField="id"
          loading={inventoryLoading}
          emptyMessage={t('reports.noInventoryItems')}
        />
      </SectionCard>
    </div>
  )
}
