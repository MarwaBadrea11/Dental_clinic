import { useEffect, useState } from 'react'
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
  const { inventory, inventoryLoading, inventoryError, exportLoading, exportError, loadInventory, exportReport } = useReportStore()
  const [search, setSearch]           = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)

  useEffect(() => { loadInventory({ lowStockOnly }) }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilter = () => loadInventory({ lowStockOnly })

  const filtered = (inventory?.items ?? []).filter((i) =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) || (i.sku ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const columns: ReportColumn<InventoryItem>[] = [
    { key: 'name',        header: 'Item' },
    { key: 'sku',         header: 'SKU',      render: (r) => r.sku ?? '—' },
    { key: 'category',    header: 'Category', render: (r) => r.category ?? '—' },
    { key: 'quantity',    header: 'Qty',      align: 'right' },
    { key: 'unit',        header: 'Unit' },
    { key: 'unit_cost',   header: 'Unit Cost',   align: 'right', render: (r) => formatCurrency(Number(r.unit_cost)) },
    { key: 'stock_value', header: 'Stock Value',  align: 'right', render: (r) => formatCurrency(Number(r.stock_value)) },
    {
      key: 'is_low_stock', header: 'Status',
      render: (r) => r.is_low_stock
        ? <Badge variant="error" dot>Low Stock</Badge>
        : <Badge variant="success" dot>OK</Badge>,
    },
  ]

  const s = inventory?.summary

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <TableSearch value={search} onChange={setSearch} placeholder="Search items…" className="w-52" />
          <label className="flex items-center gap-2 text-sm text-[var(--color-on-surface)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => { setLowStockOnly(e.target.checked); loadInventory({ lowStockOnly: e.target.checked }) }}
              className="accent-[var(--color-primary)]"
            />
            Low stock only
          </label>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" leftIcon={<FileText size={13} />} loading={exportLoading}
            onClick={() => exportReport('inventory', 'pdf', { lowStockOnly: lowStockOnly ? 'true' : undefined })}>
            PDF
          </Button>
          <Button variant="secondary" size="sm" leftIcon={<Table2 size={13} />} loading={exportLoading}
            onClick={() => exportReport('inventory', 'xlsx', { lowStockOnly: lowStockOnly ? 'true' : undefined })}>
            Excel
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
          <AlertTriangle size={15} /> Export failed: {exportError}
        </div>
      )}

      {/* KPI strip */}
      {s && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Items',       value: s.total_items,                                    color: 'primary' },
            { label: 'Stock Value',       value: formatCurrency(Number(s.total_stock_value ?? 0)), color: 'secondary' },
            { label: 'Low Stock',         value: s.low_stock_count,                                color: 'warning' },
            { label: 'Out of Stock',      value: s.out_of_stock_count,                             color: 'error' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-lg)] border border-[var(--color-outline-variant)]/20 shadow-[var(--shadow-card)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{kpi.label}</p>
              <p className="text-xl font-bold text-[var(--color-on-surface)] mt-1">{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      <SectionCard title="Inventory Items" icon={<Package size={15} />} subtitle={`${filtered.length} items`} delay={0.05}>
        <ReportTable<InventoryItem>
          columns={columns}
          rows={filtered}
          keyField="id"
          loading={inventoryLoading}
          emptyMessage="No inventory items found"
        />
      </SectionCard>
    </div>
  )
}
