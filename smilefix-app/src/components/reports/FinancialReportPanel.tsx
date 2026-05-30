import { useEffect, useState } from 'react'
import { DollarSign, TrendingUp, AlertCircle, FileText, Table2 } from 'lucide-react'
import { SectionCard } from '@/components/ui/SectionCard'
import { Button } from '@/components/ui/Button'
import { ReportTable, type ReportColumn } from './ReportTable'
import { ReportFilters } from './ReportFilters'
import { useReportStore } from '@/store/reportStore'
import { formatCurrency } from '@/utils/format'
import type { MonthlyBreakdown, TopProcedure } from '@/services/reportService'

export function FinancialReportPanel() {
  const { financial, financialLoading, financialError, exportLoading, loadFinancial, exportReport } = useReportStore()
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({})

  useEffect(() => { loadFinancial(dateRange) }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const handleApply = (from: string, to: string) => {
    const params = { ...(from && { from }), ...(to && { to }) }
    setDateRange(params)
    loadFinancial(params)
  }

  const monthlyColumns: ReportColumn<MonthlyBreakdown>[] = [
    { key: 'month',     header: 'Month' },
    { key: 'invoiced',  header: 'Invoiced',  align: 'right', render: (r) => formatCurrency(Number(r.invoiced)) },
    { key: 'collected', header: 'Collected', align: 'right', render: (r) => formatCurrency(Number(r.collected)) },
    {
      key: 'diff', header: 'Outstanding', align: 'right',
      render: (r) => {
        const diff = Number(r.invoiced) - Number(r.collected)
        return <span className={diff > 0 ? 'text-[var(--color-error)]' : 'text-[var(--color-secondary)]'}>{formatCurrency(diff)}</span>
      },
    },
  ]

  const procedureColumns: ReportColumn<TopProcedure>[] = [
    { key: 'procedure_name', header: 'Procedure' },
    { key: 'occurrences',    header: 'Count',   align: 'right' },
    { key: 'revenue',        header: 'Revenue', align: 'right', render: (r) => formatCurrency(Number(r.revenue)) },
  ]

  const t = financial?.totals

  return (
    <div className="space-y-5">
      {/* Filters + export */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <ReportFilters onApply={handleApply} loading={financialLoading} />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" leftIcon={<FileText size={13} />} loading={exportLoading}
            onClick={() => exportReport('financial', 'pdf', dateRange as Record<string, string>)}>
            PDF
          </Button>
          <Button variant="secondary" size="sm" leftIcon={<Table2 size={13} />} loading={exportLoading}
            onClick={() => exportReport('financial', 'xlsx', dateRange as Record<string, string>)}>
            Excel
          </Button>
        </div>
      </div>

      {financialError && (
        <div className="flex items-center gap-2 p-3 rounded-[var(--radius-DEFAULT)] bg-[var(--color-error-container)]/20 text-[var(--color-error)] text-sm">
          <AlertCircle size={15} /> {financialError}
        </div>
      )}

      {/* KPI strip */}
      {t && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Invoiced',    value: formatCurrency(Number(t.total_invoiced)),    icon: <DollarSign size={16} />, color: 'primary' },
            { label: 'Total Collected',   value: formatCurrency(Number(t.total_collected)),   icon: <TrendingUp size={16} />, color: 'secondary' },
            { label: 'Outstanding',       value: formatCurrency(Number(t.total_outstanding)), icon: <AlertCircle size={16} />, color: 'error' },
            { label: 'Invoice Count',     value: String(t.invoice_count),                     icon: <FileText size={16} />,   color: 'tertiary' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-lg)] border border-[var(--color-outline-variant)]/20 shadow-[var(--shadow-card)] p-4">
              <div className={`w-8 h-8 rounded-[var(--radius-DEFAULT)] bg-[var(--color-${kpi.color}-container)]/20 flex items-center justify-center text-[var(--color-${kpi.color})] mb-2`}>
                {kpi.icon}
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{kpi.label}</p>
              <p className="text-xl font-bold text-[var(--color-on-surface)] mt-0.5">{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-12 gap-5">
        {/* Monthly breakdown */}
        <div className="col-span-12 lg:col-span-7">
          <SectionCard title="Monthly Breakdown" icon={<TrendingUp size={15} />} delay={0.05}>
            <ReportTable<MonthlyBreakdown>
              columns={monthlyColumns}
              rows={financial?.monthly ?? []}
              keyField="month"
              loading={financialLoading}
              emptyMessage="No monthly data for this period"
            />
          </SectionCard>
        </div>

        {/* Payment methods */}
        <div className="col-span-12 lg:col-span-5">
          <SectionCard title="Payment Methods" icon={<DollarSign size={15} />} delay={0.1}>
            {financialLoading ? (
              <div className="flex justify-center py-10">
                <span className="w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-3 py-1">
                {(financial?.byMethod ?? []).map((m) => {
                  const total = Number(financial?.totals.total_collected ?? 1)
                  const pct   = total > 0 ? Math.round((Number(m.total) / total) * 100) : 0
                  return (
                    <div key={m.method}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-[var(--color-on-surface)]">{m.method}</span>
                        <span className="text-[var(--color-on-surface-variant)]">{formatCurrency(Number(m.total))} · {m.count} payments</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[var(--color-surface-container-high)]">
                        <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      {/* Top procedures */}
      <SectionCard title="Top Procedures by Revenue" icon={<FileText size={15} />} delay={0.15}>
        <ReportTable<TopProcedure>
          columns={procedureColumns}
          rows={financial?.topProcedures ?? []}
          keyField="procedure_name"
          loading={financialLoading}
          emptyMessage="No procedure data"
        />
      </SectionCard>
    </div>
  )
}
