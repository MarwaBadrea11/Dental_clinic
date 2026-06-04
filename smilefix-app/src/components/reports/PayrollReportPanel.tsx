import { useEffect, useState } from 'react'
import { Users, FileText, Table2, AlertCircle } from 'lucide-react'
import { SectionCard } from '@/components/ui/SectionCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ReportTable, type ReportColumn } from './ReportTable'
import { useReportStore } from '@/store/reportStore'
import { formatCurrency } from '@/utils/format'
import type { PayrollRecord } from '@/services/reportService'

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)  // 'YYYY-MM'
}

export function PayrollReportPanel() {
  const { payroll, payrollLoading, payrollError, exportLoading, exportError, loadPayroll, exportReport } = useReportStore()
  const [month, setMonth] = useState(currentMonth())

  useEffect(() => { loadPayroll(month) }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const columns: ReportColumn<PayrollRecord>[] = [
    { key: 'full_name', header: 'Name',       render: (r) => r.full_name ?? r.username },
    { key: 'role',      header: 'Role',       render: (r) => <span className="capitalize">{r.role.toLowerCase()}</span> },
    { key: 'base_salary',  header: 'Base',       align: 'right', render: (r) => formatCurrency(Number(r.base_salary)) },
    { key: 'bonuses',      header: 'Bonuses',    align: 'right', render: (r) => formatCurrency(Number(r.bonuses)) },
    { key: 'deductions',   header: 'Deductions', align: 'right', render: (r) => formatCurrency(Number(r.deductions)) },
    { key: 'net_salary',   header: 'Net',        align: 'right', render: (r) => (
      <span className="font-bold text-[var(--color-primary)]">{formatCurrency(Number(r.net_salary))}</span>
    )},
    { key: 'status', header: 'Status', render: (r) => (
      <Badge variant={r.status === 'PAID' ? 'success' : 'warning'} dot>{r.status}</Badge>
    )},
  ]

  const t = payroll?.totals

  return (
    <div className="space-y-5">
      {/* Month picker + export */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">
              Month
            </label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-[var(--radius-DEFAULT)] border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-low)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
            />
          </div>
          <Button size="sm" loading={payrollLoading} onClick={() => loadPayroll(month)}>
            Load
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" leftIcon={<FileText size={13} />} loading={exportLoading}
            onClick={() => exportReport('payroll', 'pdf', { month })}>
            PDF
          </Button>
          <Button variant="secondary" size="sm" leftIcon={<Table2 size={13} />} loading={exportLoading}
            onClick={() => exportReport('payroll', 'xlsx', { month })}>
            Excel
          </Button>
        </div>
      </div>

      {payrollError && (
        <div className="flex items-center gap-2 p-3 rounded-[var(--radius-DEFAULT)] bg-[var(--color-error-container)]/20 text-[var(--color-error)] text-sm">
          <AlertCircle size={15} /> {payrollError}
        </div>
      )}
      {exportError && (
        <div className="flex items-center gap-2 p-3 rounded-[var(--radius-DEFAULT)] bg-[var(--color-error-container)]/20 text-[var(--color-error)] text-sm">
          <AlertCircle size={15} /> Export failed: {exportError}
        </div>
      )}

      {/* KPI strip */}
      {t && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Headcount',   value: t.headcount },
            { label: 'Total Base',  value: formatCurrency(Number(t.total_base)) },
            { label: 'Bonuses',     value: formatCurrency(Number(t.total_bonuses)) },
            { label: 'Deductions',  value: formatCurrency(Number(t.total_deductions)) },
            { label: 'Net Payroll', value: formatCurrency(Number(t.total_net)) },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-lg)] border border-[var(--color-outline-variant)]/20 shadow-[var(--shadow-card)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{kpi.label}</p>
              <p className="text-xl font-bold text-[var(--color-on-surface)] mt-1">{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      <SectionCard title={`Staff Payroll — ${month}`} icon={<Users size={15} />} delay={0.05}>
        <ReportTable<PayrollRecord>
          columns={columns}
          rows={payroll?.records ?? []}
          keyField="user_id"
          loading={payrollLoading}
          emptyMessage="No payroll records for this month"
        />
      </SectionCard>
    </div>
  )
}
