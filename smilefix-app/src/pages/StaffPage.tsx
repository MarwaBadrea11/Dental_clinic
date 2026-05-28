import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { UserPlus, Users, LayoutGrid, List, Calendar } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { InfoGrid } from '@/components/ui/InfoGrid'
import { DataTable, type DataTableColumn, type DataTableAction } from '@/components/ui/DataTable'
import { EmployeeCard, AttendanceWidget, SalaryCard, ShiftTable } from '@/components/staff'
import { useStaffStore } from '@/store/staffStore'
import { formatDate, formatCurrency } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { StaffMember } from '@/types'

type ViewMode = 'team' | 'attendance' | 'schedule' | 'payroll'

export default function StaffPage() {
  const { t } = useTranslation()
  const { staff, getTodayAttendance } = useStaffStore()
  const [viewMode, setViewMode] = useState<ViewMode>('team')
  const [listMode, setListMode] = useState<'grid' | 'table'>('grid')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<StaffMember | null>(null)

  const todayAttendance = getTodayAttendance()

  const ROLE_OPTIONS = [
    { value: 'all', label: t('staff.allRoles') },
    ...['doctor','nurse','receptionist','hygienist','assistant','admin','manager']
      .map((r) => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) })),
  ]
  const STATUS_OPTIONS = [
    { value: 'all',      label: t('staff.allStatuses') },
    { value: 'active',   label: t('status.active') },
    { value: 'inactive', label: t('status.inactive') },
    { value: 'on-leave', label: t('status.onLeave') },
  ]

  const filtered = staff.filter((m) => {
    const matchRole = roleFilter === 'all' || m.role === roleFilter
    const matchStatus = statusFilter === 'all' || m.status === statusFilter
    const q = search.toLowerCase()
    const matchSearch = !q || [`${m.firstName} ${m.lastName}`, m.email, m.role, m.employeeCode].some((v) => v.toLowerCase().includes(q))
    return matchRole && matchStatus && matchSearch
  })

  const columns: DataTableColumn<StaffMember>[] = [
    {
      key: 'name', header: t('nav.staff'), sortable: true,
      render: (m) => (
        <div className="flex items-center gap-3">
          <Avatar name={`${m.firstName} ${m.lastName}`} size="sm" />
          <div><p className="font-semibold text-sm">{m.firstName} {m.lastName}</p><p className="text-[11px] text-[var(--color-on-surface-variant)]">{m.employeeCode}</p></div>
        </div>
      ),
    },
    { key: 'role',       header: t('common.role'),       sortable: true, render: (m) => <span className="text-sm capitalize">{m.role}</span> },
    { key: 'department', header: t('staff.department'),  sortable: true, render: (m) => <span className="text-sm">{m.department ?? '—'}</span> },
    { key: 'email',      header: t('common.email'),      render: (m) => <span className="text-xs">{m.email}</span> },
    { key: 'joinDate',   header: t('staff.joinDate'),    sortable: true, render: (m) => <span className="text-sm">{formatDate(m.joinDate)}</span> },
    {
      key: 'status', header: t('common.status'), sortable: true,
      render: (m) => (
        <Badge variant={m.status === 'active' ? 'success' : m.status === 'on-leave' ? 'warning' : 'neutral'} dot size="sm">
          {m.status === 'on-leave' ? t('status.onLeave') : m.status === 'active' ? t('status.active') : t('status.inactive')}
        </Badge>
      ),
    },
  ]

  const actions: DataTableAction<StaffMember>[] = [
    { label: t('patients.viewProfile'), onClick: (m) => setSelected(m) },
  ]

  const TABS = [
    { id: 'team'       as ViewMode, label: `${t('staff.team')} (${staff.length})` },
    { id: 'attendance' as ViewMode, label: t('staff.attendance') },
    { id: 'schedule'   as ViewMode, label: t('staff.schedule') },
    { id: 'payroll'    as ViewMode, label: t('staff.payroll') },
  ]

  return (
    <div>
      <PageHeader
        title={t('staff.title')}
        subtitle={t('staff.subtitle')}
        breadcrumb={[{ label: t('nav.dashboard'), href: '/' }, { label: t('nav.staff') }]}
        actions={<Button size="sm" leftIcon={<UserPlus size={14} />}>{t('staff.addStaff')}</Button>}
      />

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: t('staff.totalStaff'),   value: staff.length,                                          color: 'text-[var(--color-primary)]' },
          { label: t('status.active'),      value: staff.filter((m) => m.status === 'active').length,     color: 'text-[var(--color-secondary)]' },
          { label: t('status.onLeave'),     value: staff.filter((m) => m.status === 'on-leave').length,   color: 'text-amber-600' },
          { label: t('staff.presentToday'), value: todayAttendance.filter((a) => a.status === 'present').length, color: 'text-[var(--color-primary)]' },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-lg)] border border-[var(--color-outline-variant)]/20 shadow-[var(--shadow-card)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </motion.div>

      <div className="flex items-center gap-1 bg-[var(--color-surface-container-low)] rounded-[var(--radius-lg)] p-1 mb-6 w-fit">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setViewMode(tab.id)}
            className={cn('px-4 py-2 rounded-[var(--radius-DEFAULT)] text-sm font-medium transition-all duration-200 whitespace-nowrap',
              viewMode === tab.id ? 'bg-[var(--color-surface-container-lowest)] text-[var(--color-primary)] shadow-[var(--shadow-card)]' : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]')}>
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'team' && (
          <motion.div key="team" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <SectionCard noPadding>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-5 py-4 border-b border-[var(--color-outline-variant)]/20">
                <SearchBar value={search} onChange={setSearch} placeholder={t('staff.searchPlaceholder')} className="w-full sm:max-w-xs" />
                <div className="flex items-center gap-2 ml-auto">
                  <Select options={ROLE_OPTIONS} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} fullWidth={false} className="text-xs py-1.5" />
                  <Select options={STATUS_OPTIONS} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} fullWidth={false} className="text-xs py-1.5" />
                  <div className="flex items-center bg-[var(--color-surface-container-low)] rounded-[var(--radius-DEFAULT)] p-0.5">
                    {(['grid', 'table'] as const).map((m) => (
                      <button key={m} onClick={() => setListMode(m)} className={cn('p-1.5 rounded transition-colors', listMode === m ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-on-surface-variant)]')}>
                        {m === 'grid' ? <LayoutGrid size={15} /> : <List size={15} />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <AnimatePresence mode="wait">
                {listMode === 'grid' ? (
                  <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-5">
                    {filtered.length === 0 ? <p className="text-center text-sm text-[var(--color-on-surface-variant)] py-10">{t('staff.noStaff')}</p> : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filtered.map((m, i) => <EmployeeCard key={m.id} member={m} onClick={setSelected} delay={i * 0.04} />)}
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <DataTable columns={columns} data={filtered} actions={actions} searchable={false} externalSearch={search} pageSize={8} emptyTitle={t('staff.noStaff')} emptyIcon={<Users size={28} />} onRowClick={setSelected} />
                  </motion.div>
                )}
              </AnimatePresence>
            </SectionCard>
          </motion.div>
        )}

        {viewMode === 'attendance' && (
          <motion.div key="attendance" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <AttendanceWidget attendance={todayAttendance} staff={staff} delay={0.05} />
          </motion.div>
        )}

        {viewMode === 'schedule' && (
          <motion.div key="schedule" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <SectionCard title={t('staff.weeklySchedule')} icon={<Calendar size={15} />} noPadding>
              <ShiftTable staff={staff} delay={0.05} />
            </SectionCard>
          </motion.div>
        )}

        {viewMode === 'payroll' && (
          <motion.div key="payroll" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
                {[
                  { label: t('staff.monthlyPayroll'), value: formatCurrency(staff.reduce((s, m) => s + (m.salary ?? 0), 0)),       color: 'text-[var(--color-primary)]' },
                  { label: t('staff.annualPayroll'),  value: formatCurrency(staff.reduce((s, m) => s + (m.salary ?? 0), 0) * 12),  color: 'text-[var(--color-secondary)]' },
                  { label: t('staff.avgSalary'),      value: formatCurrency(staff.reduce((s, m) => s + (m.salary ?? 0), 0) / staff.length), color: 'text-[var(--color-tertiary)]' },
                ].map((s) => (
                  <div key={s.label} className="bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-lg)] border border-[var(--color-outline-variant)]/20 shadow-[var(--shadow-card)] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{s.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {staff.filter((m) => m.salary).map((m, i) => <SalaryCard key={m.id} member={m} delay={i * 0.04} />)}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.firstName} ${selected.lastName}` : ''} size="md">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar name={`${selected.firstName} ${selected.lastName}`} size="xl" ring />
              <div>
                <p className="text-lg font-bold text-[var(--color-on-surface)]">{selected.firstName} {selected.lastName}</p>
                <p className="text-sm text-[var(--color-on-surface-variant)] capitalize">{selected.role}{selected.specialty ? ` · ${selected.specialty}` : ''}</p>
                <Badge variant={selected.status === 'active' ? 'success' : selected.status === 'on-leave' ? 'warning' : 'neutral'} dot size="sm" className="mt-1">
                  {selected.status === 'on-leave' ? t('status.onLeave') : selected.status === 'active' ? t('status.active') : t('status.inactive')}
                </Badge>
              </div>
            </div>
            <InfoGrid cols={2} items={[
              { label: t('staff.employeeCode'), value: <span className="font-mono text-[var(--color-primary)]">{selected.employeeCode}</span> },
              { label: t('staff.department'),   value: selected.department ?? '—' },
              { label: t('common.email'),        value: selected.email },
              { label: t('common.phone'),        value: selected.phone },
              { label: t('staff.joinDate'),      value: formatDate(selected.joinDate) },
              { label: t('staff.shift'),         value: selected.shift ?? '—' },
              { label: t('staff.salary'),        value: selected.salary ? formatCurrency(selected.salary) : '—' },
              { label: t('staff.workingDays'),   value: selected.workingDays?.join(', ') ?? '—' },
            ]} />
            <div className="flex justify-end pt-2"><Button size="sm" onClick={() => setSelected(null)}>{t('common.close')}</Button></div>
          </div>
        )}
      </Modal>
    </div>
  )
}
