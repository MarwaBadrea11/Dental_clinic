import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldCheck, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { SectionCard } from '@/components/ui/SectionCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ReportTable, type ReportColumn } from './ReportTable'
import { ReportFilters } from './ReportFilters'
import { useReportStore } from '@/store/reportStore'
import { formatDate } from '@/utils/format'
import { getAuditActionLabel } from '@/i18n/reportOptions'
import { getStaffRoleLabel } from '@/i18n/staffOptions'
import type { AuditLog } from '@/services/reportService'

const ACTION_VARIANT: Record<AuditLog['action'], 'success' | 'warning' | 'error' | 'neutral' | 'primary'> = {
  CREATE:            'success',
  UPDATE:            'primary',
  DELETE:            'error',
  LOGIN:             'neutral',
  LOGOUT:            'neutral',
  LOGIN_FAILED:      'warning',
  PERMISSION_DENIED: 'error',
}

const PAGE_SIZE = 50

export function AuditLogPanel() {
  const { t } = useTranslation()
  const { auditLogs, auditTotal, auditLoading, auditError, loadAuditLogs } = useReportStore()
  const [page, setPage]         = useState(1)
  const [resource, setResource] = useState('')

  const load = (p: number, res: string) =>
    loadAuditLogs({ resource: res || undefined, page: p, limit: PAGE_SIZE })

  useEffect(() => { load(1, '') }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const handleApply = (from: string, to: string) => {
    setPage(1)
    loadAuditLogs({
      resource: resource || undefined,
      from: from || undefined,
      to: to || undefined,
      page: 1,
      limit: PAGE_SIZE,
    })
  }

  const totalPages = Math.ceil(auditTotal / PAGE_SIZE)

  const columns: ReportColumn<AuditLog>[] = [
    { key: 'created_at',  header: t('reports.time'),      render: (r) => formatDate(r.created_at, { hour: '2-digit', minute: '2-digit' }) },
    { key: 'actor',       header: t('reports.actor'),     render: (r) => r.actor ?? '—' },
    { key: 'actor_role',  header: t('common.role'),       render: (r) => r.actor_role ? getStaffRoleLabel(t, r.actor_role.toLowerCase()) : '—' },
    { key: 'action',      header: t('reports.action'),    render: (r) => <Badge variant={ACTION_VARIANT[r.action]}>{getAuditActionLabel(t, r.action)}</Badge> },
    { key: 'resource',    header: t('reports.resource'),  render: (r) => <span className="font-mono text-xs">{r.resource}</span> },
    { key: 'resource_id', header: t('reports.recordId'),  render: (r) => r.resource_id ? <span className="font-mono text-[10px] text-[var(--color-on-surface-variant)]">{r.resource_id.slice(0, 8)}…</span> : '—' },
    { key: 'ip_address',  header: t('reports.ip'),        render: (r) => <span className="font-mono text-xs">{r.ip_address ?? '—'}</span> },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <ReportFilters
          onApply={handleApply}
          loading={auditLoading}
          extra={
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">
                {t('reports.resource')}
              </label>
              <input
                value={resource}
                onChange={(e) => { setResource(e.target.value); load(1, e.target.value) }}
                placeholder={t('reports.resourcePlaceholder')}
                className="px-3 py-1.5 text-sm rounded-[var(--radius-DEFAULT)] border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-low)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 w-36"
              />
            </div>
          }
        />
      </div>

      {auditError && (
        <div className="flex items-center gap-2 p-3 rounded-[var(--radius-DEFAULT)] bg-[var(--color-error-container)]/20 text-[var(--color-error)] text-sm">
          <AlertCircle size={15} /> {auditError}
        </div>
      )}

      <SectionCard title={t('reports.tabs.audit')} icon={<ShieldCheck size={15} />} subtitle={t('reports.entriesCount', { count: auditTotal })} delay={0.05}>
        <ReportTable<AuditLog>
          columns={columns}
          rows={auditLogs}
          keyField="id"
          loading={auditLoading}
          emptyMessage={t('reports.noAuditEntries')}
        />

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-[var(--color-outline-variant)]/15 mt-2">
            <span className="text-xs text-[var(--color-on-surface-variant)]">
              {t('reports.pagination', { page, totalPages, total: auditTotal })}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="xs" leftIcon={<ChevronLeft size={12} />}
                disabled={page <= 1}
                onClick={() => { const p = page - 1; setPage(p); load(p, resource) }}>
                {t('reports.prev')}
              </Button>
              <Button variant="outline" size="xs" rightIcon={<ChevronRight size={12} />}
                disabled={page >= totalPages}
                onClick={() => { const p = page + 1; setPage(p); load(p, resource) }}>
                {t('reports.next')}
              </Button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
