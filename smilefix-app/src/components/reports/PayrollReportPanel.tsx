import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Users, FileText, Table2, AlertCircle } from 'lucide-react'
import { SectionCard } from '@/components/ui/SectionCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ReportTable, type ReportColumn } from './ReportTable'
import { useReportStore } from '@/store/reportStore'
import { formatCurrency } from '@/utils/format'
import { formatPayrollMonthTitle, getPayrollStatusLabel } from '@/i18n/reportOptions'
import { getStaffRoleLabel } from '@/i18n/staffOptions'
import type { PayrollRecord } from '@/services/reportService'

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

export function PayrollReportPanel() {
  const { t, i18n } = useTranslation()
  const { payroll, payrollLoading, payrollError, exportLoading, exportError, loadPayroll, exportReport } = useReportStore()
  const [month, setMonth] = useState(currentMonth())

  useEffect(() => { loadPayroll(month) }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const columns: ReportColumn<PayrollRecord>[] = [
    { key: 'full_name', header: t('common.name'), render: (r) => r.full_name ?? r.username },
    { key: 'role',      header: t('common.role'), render: (r) => getStaffRoleLabel(t, r.role.toLowerCase()) },
    { key: 'base_salary',  header: t('reports.baseSalary'),  align: 'right', render: (r) => formatCurrency(Number(r.base_salary)) },
    { key: 'bonuses',      header: t('staff.bonus'),           align: 'right', render: (r) => formatCurrency(Number(r.bonuses)) },
    { key: 'deductions',   header: t('staff.deductions'),      align: 'right', render: (r) => formatCurrency(Number(r.deductions)) },
    { key: 'net_salary',   header: t('reports.netSalary'),     align: 'right', render: (r) => (
      <span className="font-bold text-[var(--color-primary)]">{formatCurrency(Number(r.net_salary))}</span>
    )},
    { key: 'status', header: t('common.status'), render: (r) => (
      <Badge variant={r.status === 'PAID' ? 'success' : 'warning'} dot>{getPayrollStatusLabel(t, r.status)}</Badge>
    )},
  ]

  const totals = payroll?.totals

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">
              {t('common.month')}
            </label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-[var(--radius-DEFAULT)] border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-low)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
            />
          </div>
          <Button size="sm" loading={payrollLoading} onClick={() => loadPayroll(month)}>
            {t('reports.load')}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" leftIcon={<FileText size={13} />} loading={exportLoading}
            onClick={() => exportReport('payroll', 'pdf', { month })}>
            {t('reports.exportPdf')}
          </Button>
          <Button variant="secondary" size="sm" leftIcon={<Table2 size={13} />} loading={exportLoading}
            onClick={() => exportReport('payroll', 'xlsx', { month })}>
            {t('reports.exportExcel')}
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
          <AlertCircle size={15} /> {t('reports.exportFailed', { error: exportError })}
        </div>
      )}

      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: t('reports.headcount'),   value: totals.headcount },
            { label: t('reports.totalBase'),   value: formatCurrency(Number(totals.total_base)) },
            { label: t('staff.bonus'),         value: formatCurrency(Number(totals.total_bonuses)) },
            { label: t('staff.deductions'),     value: formatCurrency(Number(totals.total_deductions)) },
            { label: t('reports.netPayroll'),   value: formatCurrency(Number(totals.total_net)) },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-lg)] border border-[var(--color-outline-variant)]/20 shadow-[var(--shadow-card)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{kpi.label}</p>
              <p className="text-xl font-bold text-[var(--color-on-surface)] mt-1">{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      <SectionCard title={formatPayrollMonthTitle(t, month, i18n.language)} icon={<Users size={15} />} delay={0.05}>
        <ReportTable<PayrollRecord>
          columns={columns}
          rows={payroll?.records ?? []}
          keyField="user_id"
          loading={payrollLoading}
          emptyMessage={t('reports.noPayrollRecords')}
        />
      </SectionCard>
    </div>
  )
}
