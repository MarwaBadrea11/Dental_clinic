import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { UserPlus, Users, LayoutGrid, List, Pencil, Trash2, Calendar, DollarSign, RefreshCw, Stethoscope, Briefcase, CalendarX } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageStatsGrid } from '@/components/shared/PageStatsGrid'
import { SectionCard } from '@/components/ui/SectionCard'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/ui/FormField'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { InfoGrid } from '@/components/ui/InfoGrid'
import { DataTable, type DataTableColumn, type DataTableAction } from '@/components/ui/DataTable'
import { EmployeeCard, AttendanceWidget, SalaryCard, ShiftTable } from '@/components/staff'
import { useStaffStore } from '@/store/staffStore'
import { formatDate, formatCurrency, localDateStr } from '@/utils/format'
import { cn } from '@/utils/cn'
import {
  buildAttendanceStatusSelectOptions,
  buildStaffRoleSelectOptions,
  buildStaffStatusSelectOptions,
  getEmployeeStatusBadgeVariant,
  getStaffRoleLabel,
  getStaffStatusLabel,
  translateStaffFormError,
} from '@/i18n/staffOptions'
import type { StaffMember, EmployeeRole, EmployeeStatus, AttendanceRecord } from '@/types'
import type { CreateStaffPayload, CreateAttendancePayload, CreateSalaryPayload, BackendSalaryRecord } from '@/services/staffService'

type ViewMode = 'team' | 'attendance' | 'schedule' | 'payroll'

// ── Staff Form Modal ──────────────────────────────────────────────────────────

interface StaffFormState {
  full_name: string
  role: EmployeeRole
  phone: string
  email: string
  shift_start: string
  shift_end: string
  base_salary: string
  status: EmployeeStatus
}

const EMPTY_STAFF_FORM: StaffFormState = {
  full_name: '', role: 'receptionist', phone: '', email: '',
  shift_start: '', shift_end: '', base_salary: '0', status: 'active',
}

function StaffModal({
  open, onClose, onSave, editMember,
}: {
  open: boolean
  onClose: () => void
  onSave: (payload: CreateStaffPayload) => Promise<void>
  editMember?: StaffMember | null
}) {
  const { t } = useTranslation()
  const [form, setForm] = useState<StaffFormState>(EMPTY_STAFF_FORM)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<StaffFormState>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  useEffect(() => {
    if (open) {
      if (editMember) {
        setForm({
          full_name: `${editMember.firstName} ${editMember.lastName}`.trim(),
          role: editMember.role,
          phone: editMember.phone,
          email: editMember.email,
          shift_start: '',
          shift_end: '',
          base_salary: String(editMember.salary ?? 0),
          status: editMember.status,
        })
      } else {
        setForm(EMPTY_STAFF_FORM)
      }
      setErrors({})
      setSubmitError(null)
    }
  }, [open, editMember])

  const set = (k: keyof StaffFormState, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const validate = (): boolean => {
    const e: Partial<StaffFormState> = {}
    if (!form.full_name.trim()) e.full_name = 'Required'
    if (!form.email.trim()) e.email = 'Required'
    if (!form.phone.trim()) e.phone = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    setSubmitError(null)
    try {
      await onSave({
        full_name: form.full_name.trim(),
        role: form.role,
        phone: form.phone.trim(),
        email: form.email.trim(),
        shift_start: form.shift_start || null,
        shift_end: form.shift_end || null,
        base_salary: parseFloat(form.base_salary) || 0,
        status: form.status,
      })
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('staff.saveFailed')
      setSubmitError(msg)
    } finally {
      setSaving(false)
    }
  }

  const ROLE_OPTS = buildStaffRoleSelectOptions(t)
  const STATUS_OPTS = buildStaffStatusSelectOptions(t)

  return (
    <Modal open={open} onClose={onClose} title={editMember ? t('staff.editStaff') : t('staff.addStaff')} size="lg">
      <div className="grid grid-cols-2 gap-4">
        <FormField label={t('common.fullName')} required error={translateStaffFormError(t, errors.full_name)} className="col-span-2">
          <Input placeholder={t('staff.fullNamePlaceholder')} value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
        </FormField>
        <FormField label={t('common.role')}>
          <Select options={ROLE_OPTS} value={form.role} onChange={(e) => set('role', e.target.value as EmployeeRole)} />
        </FormField>
        <FormField label={t('common.status')}>
          <Select options={STATUS_OPTS} value={form.status} onChange={(e) => set('status', e.target.value as EmployeeStatus)} />
        </FormField>
        <FormField label={t('common.email')} required error={translateStaffFormError(t, errors.email)}>
          <Input type="email" placeholder={t('staff.emailPlaceholder')} value={form.email} onChange={(e) => set('email', e.target.value)} />
        </FormField>
        <FormField label={t('common.phone')} required error={translateStaffFormError(t, errors.phone)}>
          <Input placeholder={t('staff.phonePlaceholder')} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </FormField>
        <FormField label={t('staff.shiftStart')}>
          <Input type="time" value={form.shift_start} onChange={(e) => set('shift_start', e.target.value)} />
        </FormField>
        <FormField label={t('staff.shiftEnd')}>
          <Input type="time" value={form.shift_end} onChange={(e) => set('shift_end', e.target.value)} />
        </FormField>
        <FormField label={t('staff.baseSalary')} className="col-span-2">
          <Input type="number" placeholder={t('staff.amountPlaceholder')} value={form.base_salary} onChange={(e) => set('base_salary', e.target.value)} />
        </FormField>
      </div>
      {submitError && (
        <p className="mt-3 text-xs text-[var(--color-error)] bg-[var(--color-error-container)] rounded-[var(--radius-DEFAULT)] px-3 py-2">
          {submitError}
        </p>
      )}
      <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-[var(--color-outline-variant)]/15">
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button onClick={handleSave} loading={saving}>
          {editMember ? t('common.save') : t('staff.addStaff')}
        </Button>
      </div>
    </Modal>
  )
}

// ── Attendance Log Modal ──────────────────────────────────────────────────────

function AttendanceModal({
  open, onClose, onSave, staff,
}: {
  open: boolean
  onClose: () => void
  onSave: (payload: CreateAttendancePayload) => Promise<AttendanceRecord | void>
  staff: StaffMember[]
}) {
  const { t } = useTranslation()
  const today = localDateStr()
  const [form, setForm] = useState({ staff_id: '', log_date: today, check_in: '', check_out: '', status: 'present' as const, notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setForm({ staff_id: '', log_date: today, check_in: '', check_out: '', status: 'present', notes: '' }) }, [open])

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.staff_id) return
    setSaving(true)
    try {
      await onSave({ ...form, check_in: form.check_in || null, check_out: form.check_out || null, notes: form.notes || null })
      onClose()
    } finally { setSaving(false) }
  }

  const STAFF_OPTS = staff.map((m) => ({ value: m.id, label: `${m.firstName} ${m.lastName}` }))
  const STATUS_OPTS = buildAttendanceStatusSelectOptions(t)

  return (
    <Modal open={open} onClose={onClose} title={t('staff.logAttendance')} size="md">
      <div className="grid grid-cols-2 gap-4">
        <FormField label={t('nav.staff')} required className="col-span-2">
          <Select options={[{ value: '', label: t('staff.selectStaffMember') }, ...STAFF_OPTS]} value={form.staff_id} onChange={(e) => set('staff_id', e.target.value)} />
        </FormField>
        <FormField label={t('common.date')}>
          <Input type="date" value={form.log_date} onChange={(e) => set('log_date', e.target.value)} />
        </FormField>
        <FormField label={t('common.status')}>
          <Select options={STATUS_OPTS} value={form.status} onChange={(e) => set('status', e.target.value)} />
        </FormField>
        <FormField label={t('staff.checkIn')}>
          <Input type="time" value={form.check_in} onChange={(e) => set('check_in', e.target.value)} />
        </FormField>
        <FormField label={t('staff.checkOut')}>
          <Input type="time" value={form.check_out} onChange={(e) => set('check_out', e.target.value)} />
        </FormField>
      </div>
      <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-[var(--color-outline-variant)]/15">
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button onClick={handleSave} loading={saving} disabled={!form.staff_id}>{t('common.save')}</Button>
      </div>
    </Modal>
  )
}

// ── Salary Record Modal ───────────────────────────────────────────────────────

function SalaryModal({
  open, onClose, onSave, staff,
}: {
  open: boolean
  onClose: () => void
  onSave: (payload: CreateSalaryPayload) => Promise<BackendSalaryRecord | void>
  staff: StaffMember[]
}) {
  const { t, i18n } = useTranslation()
  const now = new Date()
  const [form, setForm] = useState({ staff_id: '', month: String(now.getMonth() + 1), year: String(now.getFullYear()), base_salary: '', bonus: '0', deductions: '0', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setForm({ staff_id: '', month: String(now.getMonth() + 1), year: String(now.getFullYear()), base_salary: '', bonus: '0', deductions: '0', notes: '' }) }, [open])

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.staff_id || !form.base_salary) return
    setSaving(true)
    try {
      await onSave({
        staff_id: form.staff_id,
        month: parseInt(form.month),
        year: parseInt(form.year),
        base_salary: parseFloat(form.base_salary) || 0,
        bonus: parseFloat(form.bonus) || 0,
        deductions: parseFloat(form.deductions) || 0,
        notes: form.notes || null,
      })
      onClose()
    } finally { setSaving(false) }
  }

  const STAFF_OPTS = staff.map((m) => ({ value: m.id, label: `${m.firstName} ${m.lastName}` }))
  const MONTH_OPTS = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: new Date(2000, i).toLocaleString(i18n.language, { month: 'long' }),
  }))

  return (
    <Modal open={open} onClose={onClose} title={t('staff.addSalaryRecord')} size="md">
      <div className="grid grid-cols-2 gap-4">
        <FormField label={t('nav.staff')} required className="col-span-2">
          <Select options={[{ value: '', label: t('staff.selectStaffMember') }, ...STAFF_OPTS]} value={form.staff_id} onChange={(e) => set('staff_id', e.target.value)} />
        </FormField>
        <FormField label={t('common.month')}>
          <Select options={MONTH_OPTS} value={form.month} onChange={(e) => set('month', e.target.value)} />
        </FormField>
        <FormField label={t('common.year')}>
          <Input type="number" value={form.year} onChange={(e) => set('year', e.target.value)} />
        </FormField>
        <FormField label={t('staff.baseSalary')} required>
          <Input type="number" placeholder={t('staff.amountPlaceholder')} value={form.base_salary} onChange={(e) => set('base_salary', e.target.value)} />
        </FormField>
        <FormField label={t('staff.bonus')}>
          <Input type="number" placeholder={t('staff.amountPlaceholder')} value={form.bonus} onChange={(e) => set('bonus', e.target.value)} />
        </FormField>
        <FormField label={t('staff.deductions')} className="col-span-2">
          <Input type="number" placeholder={t('staff.amountPlaceholder')} value={form.deductions} onChange={(e) => set('deductions', e.target.value)} />
        </FormField>
      </div>
      <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-[var(--color-outline-variant)]/15">
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button onClick={handleSave} loading={saving} disabled={!form.staff_id || !form.base_salary}>{t('common.save')}</Button>
      </div>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function StaffPage() {
  const { t } = useTranslation()
  const {
    staff, attendance, salaryRecords, loading, dashboardStats,
    loadStaff, addStaff, editStaff, removeStaff,
    loadAttendance, addAttendance,
    loadSalaryRecords, addSalaryRecord,
    loadDashboardStats,
  } = useStaffStore()

  const [viewMode, setViewMode] = useState<ViewMode>('team')
  const [listMode, setListMode] = useState<'grid' | 'table'>('grid')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<StaffMember | null>(null)
  const [showStaffModal, setShowStaffModal] = useState(false)
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null)
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  const [showSalaryModal, setShowSalaryModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    loadStaff({ search, role: roleFilter === 'all' ? undefined : roleFilter, status: statusFilter === 'all' ? undefined : statusFilter })
    loadDashboardStats()
  }, [search, roleFilter, statusFilter])

  useEffect(() => {
    if (viewMode === 'attendance') loadAttendance({ date: localDateStr() })
    if (viewMode === 'payroll') loadSalaryRecords()
  }, [viewMode])

  const today = localDateStr()
  // API already filters by date when the attendance tab loads; compare YYYY-MM-DD only
  const todayAttendance = attendance.filter((a) => a.date?.slice(0, 10) === today)

  const ROLE_OPTIONS = buildStaffRoleSelectOptions(t, { includeAll: true })
  const STATUS_OPTIONS = buildStaffStatusSelectOptions(t, { includeAll: true })

  const handleSaveStaff = async (payload: CreateStaffPayload) => {
    if (editTarget) { await editStaff(editTarget.id, payload) }
    else { await addStaff(payload) }
    loadStaff({ search, role: roleFilter === 'all' ? undefined : roleFilter, status: statusFilter === 'all' ? undefined : statusFilter })
    loadDashboardStats()
  }

  const handleDelete = async (m: StaffMember) => {
    setDeletingId(m.id)
    try {
      await removeStaff(m.id)
      loadDashboardStats()
    }
    catch { alert(t('staff.deleteFailed')) }
    finally { setDeletingId(null); setConfirmDeleteId(null) }
  }

  const columns: DataTableColumn<StaffMember>[] = [
    {
      key: 'name', header: t('nav.staff'), sortable: true,
      render: (m) => (
        <div className="flex items-center gap-3">
          <Avatar name={`${m.firstName} ${m.lastName}`} size="sm" />
          <div>
            <p className="font-semibold text-sm">{m.firstName} {m.lastName}</p>
            <p className="text-[11px] text-[var(--color-on-surface-variant)]">{m.employeeCode}</p>
          </div>
        </div>
      ),
    },
    { key: 'role',   header: t('common.role'),   sortable: true, render: (m) => <span className="text-sm">{getStaffRoleLabel(t, m.role)}</span> },
    { key: 'email',  header: t('common.email'),  render: (m) => <span className="text-xs">{m.email}</span> },
    { key: 'phone',  header: t('common.phone'),  render: (m) => <span className="text-sm">{m.phone}</span> },
    {
      key: 'status', header: t('common.status'), sortable: true,
      render: (m) => (
        <Badge variant={getEmployeeStatusBadgeVariant(m.status)} dot size="sm">
          {getStaffStatusLabel(t, m.status)}
        </Badge>
      ),
    },
  ]

  const actions: DataTableAction<StaffMember>[] = [
    { label: t('patients.viewProfile'), onClick: (m) => setSelected(m) },
    { label: t('common.edit'), icon: <Pencil size={13} />, onClick: (m) => { setEditTarget(m); setShowStaffModal(true) } },
    { label: t('common.delete'), icon: <Trash2 size={13} />, danger: true, onClick: (m) => setConfirmDeleteId(m.id) },
  ]

  const TABS = [
    { id: 'team'       as ViewMode, label: `${t('staff.team')} (${staff.length})` },
    { id: 'attendance' as ViewMode, label: t('staff.attendance') },
    { id: 'schedule'   as ViewMode, label: t('staff.schedule') },
    { id: 'payroll'    as ViewMode, label: t('staff.payroll') },
  ]

  const totalPayroll = salaryRecords.reduce((s, r) => s + Number(r.net_salary), 0)
  const avgSalary = salaryRecords.length > 0 ? totalPayroll / salaryRecords.length : 0

  return (
    <div>
      <PageHeader
        title={t('staff.title')}
        subtitle={t('staff.subtitle')}
        breadcrumb={[{ label: t('nav.dashboard'), href: '/' }, { label: t('nav.staff') }]}
        actions={
          <Button size="sm" leftIcon={<UserPlus size={14} />} onClick={() => { setEditTarget(null); setShowStaffModal(true) }}>
            {t('staff.addStaff')}
          </Button>
        }
      />

      {/* Stats */}
      <PageStatsGrid
        className="mb-6"
        stats={[
          {
            label: t('staff.totalStaff'),
            value: dashboardStats?.total ?? staff.length,
            icon: <Users size={18} />,
            color: 'text-[var(--color-primary)]',
            bg:    'bg-[var(--color-primary-container)]/20',
          },
          {
            label: t('status.active'),
            value: dashboardStats?.active ?? staff.filter((m) => m.status === 'active').length,
            icon: <Stethoscope size={18} />,
            color: 'text-[var(--color-secondary)]',
            bg:    'bg-[var(--color-secondary-container)]/20',
          },
          {
            label: t('status.onLeave'),
            value: dashboardStats?.onLeave ?? staff.filter((m) => m.status === 'on-leave').length,
            icon: <CalendarX size={18} />,
            color: 'text-[var(--color-tertiary)]',
            bg:    'bg-[var(--color-tertiary-container)]/20',
          },
          {
            label: t('staff.presentToday'),
            value: dashboardStats?.presentToday ?? todayAttendance.filter((a) => a.status === 'present').length,
            icon: <Briefcase size={18} />,
            color: 'text-[var(--color-on-surface-variant)]',
            bg:    'bg-[var(--color-surface-container-high)]',
          },
        ]}
      />

      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-[var(--color-surface-container-low)] rounded-[var(--radius-lg)] p-1 mb-6 overflow-x-auto tab-bar-scroll max-w-full">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setViewMode(tab.id)}
            className={cn('px-4 py-2 rounded-[var(--radius-DEFAULT)] text-sm font-medium transition-all duration-200 whitespace-nowrap',
              viewMode === tab.id ? 'bg-[var(--color-surface-container-lowest)] text-[var(--color-primary)] shadow-[var(--shadow-card)]' : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]')}>
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Team Tab ── */}
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
                    {staff.length === 0 ? (
                      <p className="text-center text-sm text-[var(--color-on-surface-variant)] py-10">{t('staff.noStaff')}</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {staff.map((m, i) => (
                          <div key={m.id} className="relative group">
                            <EmployeeCard member={m} onClick={setSelected} delay={i * 0.04} />
                            <div className="absolute top-2 right-2 hidden group-hover:flex items-center gap-1 bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-DEFAULT)] shadow-[var(--shadow-card)] p-1">
                              <button onClick={(e) => { e.stopPropagation(); setEditTarget(m); setShowStaffModal(true) }} className="p-1 rounded hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]"><Pencil size={12} /></button>
                              <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(m.id) }} disabled={deletingId === m.id} className="p-1 rounded hover:bg-[var(--color-error-container)] text-[var(--color-error)] disabled:opacity-50"><Trash2 size={12} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <DataTable columns={columns} data={staff} actions={actions} loading={loading} searchable={false} externalSearch={search} pageSize={8} emptyTitle={t('staff.noStaff')} emptyIcon={<Users size={28} />} onRowClick={(row) => setSelected(row as StaffMember)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </SectionCard>
          </motion.div>
        )}

        {/* ── Attendance Tab ── */}
        {viewMode === 'attendance' && (
          <motion.div key="attendance" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="flex justify-end mb-4 gap-2">
              <Button size="sm" variant="ghost" leftIcon={<RefreshCw size={14} />} onClick={() => loadAttendance({ date: localDateStr() })}>
                {t('common.refresh')}
              </Button>
              <Button size="sm" leftIcon={<Calendar size={14} />} onClick={() => setShowAttendanceModal(true)}>
                {t('staff.logAttendance')}
              </Button>
            </div>
            <AttendanceWidget attendance={attendance} staff={staff} delay={0.05} />
          </motion.div>
        )}

        {/* ── Schedule Tab ── */}
        {viewMode === 'schedule' && (
          <motion.div key="schedule" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <SectionCard title={t('staff.weeklySchedule')} icon={<Calendar size={15} />} noPadding>
              <ShiftTable staff={staff} delay={0.05} />
            </SectionCard>
          </motion.div>
        )}

        {/* ── Payroll Tab ── */}
        {viewMode === 'payroll' && (
          <motion.div key="payroll" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="flex justify-end mb-4 gap-2">
              <Button size="sm" variant="ghost" leftIcon={<RefreshCw size={14} />} onClick={() => loadSalaryRecords()}>
                {t('common.refresh')}
              </Button>
              <Button size="sm" leftIcon={<DollarSign size={14} />} onClick={() => setShowSalaryModal(true)}>
                {t('staff.addSalaryRecord')}
              </Button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
                {[
                  { label: t('staff.monthlyPayroll'), value: formatCurrency(totalPayroll),       color: 'text-[var(--color-primary)]' },
                  { label: t('staff.annualPayroll'),  value: formatCurrency(totalPayroll * 12),  color: 'text-[var(--color-secondary)]' },
                  { label: t('staff.avgSalary'),      value: formatCurrency(avgSalary),          color: 'text-[var(--color-tertiary)]' },
                ].map((s) => (
                  <div key={s.label} className="bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-lg)] border border-[var(--color-outline-variant)]/20 shadow-[var(--shadow-card)] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{s.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
              {salaryRecords.length === 0 ? (
                <div className="text-center py-12 text-sm text-[var(--color-on-surface-variant)]">
                  {t('staff.noSalaryRecords')}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {salaryRecords.map((r, i) => {
                    const member = staff.find((m) => m.id === r.staff_id)
                    if (!member) return null
                    const enriched = { ...member, salary: Number(r.net_salary) }
                    return <SalaryCard key={r.id} member={enriched} delay={i * 0.04} />
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.firstName} ${selected.lastName}` : ''} size="md">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar name={`${selected.firstName} ${selected.lastName}`} size="xl" ring />
              <div className="min-w-0">
                <p className="text-lg font-bold text-[var(--color-on-surface)] truncate">{selected.firstName} {selected.lastName}</p>
                <p className="text-sm text-[var(--color-on-surface-variant)]">{getStaffRoleLabel(t, selected.role)}</p>
                <Badge variant={getEmployeeStatusBadgeVariant(selected.status)} dot size="sm" className="mt-1">
                  {getStaffStatusLabel(t, selected.status)}
                </Badge>
              </div>
            </div>
            <InfoGrid cols={2} items={[
              { label: t('staff.employeeCode'), value: <span className="font-mono text-[var(--color-primary)]">{selected.employeeCode}</span> },
              { label: t('common.role'),         value: getStaffRoleLabel(t, selected.role) },
              { label: t('common.email'),        value: selected.email },
              { label: t('common.phone'),        value: selected.phone },
              { label: t('staff.joinDate'),      value: formatDate(selected.joinDate) },
              { label: t('staff.salary'),        value: selected.salary ? formatCurrency(selected.salary) : '—' },
            ]} />
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" leftIcon={<Pencil size={13} />} onClick={() => { setSelected(null); setEditTarget(selected); setShowStaffModal(true) }}>
                {t('common.edit')}
              </Button>
              <Button size="sm" onClick={() => setSelected(null)}>{t('common.close')}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Staff Add/Edit Modal */}
      <StaffModal
        open={showStaffModal}
        onClose={() => { setShowStaffModal(false); setEditTarget(null) }}
        onSave={handleSaveStaff}
        editMember={editTarget}
      />

      {/* Attendance Modal */}
      <AttendanceModal
        open={showAttendanceModal}
        onClose={() => setShowAttendanceModal(false)}
        onSave={async (payload) => {
          await addAttendance(payload)
          loadAttendance({ date: localDateStr() })
          loadDashboardStats()
        }}
        staff={staff}
      />

      {/* Salary Modal */}
      <SalaryModal
        open={showSalaryModal}
        onClose={() => setShowSalaryModal(false)}
        onSave={async (payload) => {
          const record = await addSalaryRecord(payload)
          loadSalaryRecords()
          return record
        }}
        staff={staff}
      />

      {/* Delete Confirmation Modal */}
      {(() => {
        const target = staff.find((m) => m.id === confirmDeleteId)
        return (
          <Modal open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)} title={t('common.confirmDelete', { defaultValue: 'Confirm Delete' })} size="sm">
            {target && (
              <div className="space-y-4">
                <p className="text-sm text-[var(--color-on-surface-variant)]">
                  {t('staff.confirmDeleteMessage', { name: `${target.firstName} ${target.lastName}` })}
                </p>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-outline-variant)]/15">
                  <Button variant="ghost" onClick={() => setConfirmDeleteId(null)} disabled={!!deletingId}>{t('common.cancel')}</Button>
                  <Button
                    variant="danger"
                    loading={!!deletingId}
                    onClick={() => handleDelete(target)}
                    leftIcon={<Trash2 size={13} />}
                  >
                    {t('common.delete')}
                  </Button>
                </div>
              </div>
            )}
          </Modal>
        )
      })()}
    </div>
  )
}
