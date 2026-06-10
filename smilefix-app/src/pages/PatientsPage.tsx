import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { UserPlus, Users, LayoutGrid, List } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type DataTableColumn, type DataTableAction } from '@/components/ui/DataTable'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { SearchBar } from '@/components/ui/SearchBar'
import { SectionCard } from '@/components/ui/SectionCard'
import { PatientCard } from '@/components/patients/PatientCard'
import { usePatientStore } from '@/store/patientStore'
import { formatDate } from '@/utils/format'
import { ROUTES } from '@/constants/routes'
import { getGenderLabel } from '@/i18n/patientOdontogramOptions'
import type { Patient } from '@/types'

type ViewMode = 'table' | 'grid'

export default function PatientsPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { patients, loadPatients, loading } = usePatientStore()
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => { loadPatients() }, [])

  const STATUS_FILTER_OPTIONS = [
    { value: 'all',      label: t('common.allStatuses') },
    { value: 'active',   label: t('status.active') },
    { value: 'inactive', label: t('status.inactive') },
    { value: 'pending',  label: t('status.pending') },
  ]

  // Filter data
  const filtered = patients.filter((p) => {
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    const q = search.toLowerCase()
    const matchSearch = !q || [p.firstName, p.lastName, p.patientCode, p.email, p.phone]
      .some((v) => v?.toLowerCase().includes(q))
    return matchStatus && matchSearch
  })

  const columns: DataTableColumn<Patient>[] = [
    {
      key: 'name', header: t('common.patient'), sortable: true,
      render: (p) => (
        <div className="flex items-center gap-3">
          <Avatar name={`${p.firstName} ${p.lastName}`} src={p.avatar} size="sm" />
          <div className="min-w-0">
            <p className="font-semibold text-sm text-[var(--color-on-surface)] truncate">{p.firstName} {p.lastName}</p>
            <p className="text-xs text-[var(--color-on-surface-variant)] font-mono">{p.patientCode}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone', header: t('patients.phone'), sortable: false,
      render: (p) => <span className="text-sm">{p.phone}</span>,
    },
    {
      key: 'gender', header: t('patients.gender'), sortable: true,
      render: (p) => (
        <span className="text-sm text-[var(--color-on-surface-variant)]">{getGenderLabel(t, p.gender)}</span>
      ),
    },
    {
      key: 'city', header: t('patients.city'), sortable: true,
      render: (p) => (
        <span className="text-sm text-[var(--color-on-surface-variant)]">{p.city ?? '—'}</span>
      ),
    },
    {
      key: 'email', header: t('patients.email'), sortable: false,
      render: (p) => (
        <span className="text-sm text-[var(--color-on-surface-variant)] truncate max-w-[160px] block">
          {p.email ?? '—'}
        </span>
      ),
    },
    {
      key: 'createdAt', header: t('patients.registered'), sortable: true,
      render: (p) => (
        <span className="text-sm text-[var(--color-on-surface-variant)]">
          {p.createdAt ? formatDate(p.createdAt) : '—'}
        </span>
      ),
    },
    {
      key: 'bloodType', header: t('patients.bloodType'), sortable: false,
      render: (p) => p.bloodType
        ? <Badge variant="neutral" size="sm">{p.bloodType}</Badge>
        : <span className="text-sm text-[var(--color-on-surface-variant)]">—</span>,
    },
  ]

  const actions: DataTableAction<Patient>[] = [
    { label: t('patients.viewProfile'), onClick: (p) => navigate(`/patients/${p.id}`) },
    { label: t('patients.editPatient'), onClick: (p) => navigate(`/patients/${p.id}/edit`) },
  ]

  return (
    <div>
      <PageHeader
        title={t('patients.title')}
        subtitle={`${patients.length} ${t('patients.subtitle')}`}
        breadcrumb={[{ label: t('nav.dashboard'), href: '/' }, { label: t('nav.patients') }]}
        actions={
          <Button leftIcon={<UserPlus size={16} />} size="sm" onClick={() => navigate(ROUTES.PATIENT_NEW)}>
            {t('patients.newPatient')}
          </Button>
        }
      />

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}
        className="patients-stats-grid"
      >
        {[
          { label: t('patients.total'),   value: patients.length,                                    color: 'text-[var(--color-primary)]' },
          { label: t('status.active'),    value: patients.filter((p) => p.status === 'active').length,  color: 'text-[var(--color-secondary)]' },
          { label: t('status.pending'),   value: patients.filter((p) => p.status === 'pending').length, color: 'text-amber-600' },
          { label: t('patients.overdue'), value: patients.filter((p) => (p.balance ?? 0) > 0).length,  color: 'text-[var(--color-error)]' },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-lg)] border border-[var(--color-outline-variant)]/20 shadow-[var(--shadow-card)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </motion.div>

      {/* Main table/grid */}
      <SectionCard noPadding delay={0.1}>
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-5 py-4 border-b border-[var(--color-outline-variant)]/20">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={t('patients.searchPlaceholder') ?? 'Search patients by name, code, or phone…'}
            maxWidth="26rem"
          />
          <div className="flex items-center gap-2 ml-auto">
            <Select
              options={STATUS_FILTER_OPTIONS}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              fullWidth={false}
              className="text-xs py-1.5"
            />
            {/* View toggle */}
            <div className="flex items-center bg-[var(--color-surface-container-low)] rounded-[var(--radius-DEFAULT)] p-0.5">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded transition-colors ${viewMode === 'table' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'}`}
                aria-label={t('common.tableView')}
              >
                <List size={15} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'}`}
                aria-label={t('common.gridView')}
              >
                <LayoutGrid size={15} />
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'table' ? (
          <DataTable
            columns={columns}
            data={filtered}
            actions={actions}
            searchable={false}
            externalSearch={search}
            pageSize={8}
            emptyTitle={t('patients.noPatients')}
            emptyDescription={t('patients.adjustFilters')}
            emptyIcon={<Users size={28} />}
            onRowClick={(p) => navigate(`/patients/${p.id}`)}
          />
        ) : (
          <div className="p-5">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-sm text-[var(--color-on-surface-variant)]">
                {t('patients.noPatients')}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '1rem' }} className="patients-card-grid">
                {filtered.map((p, i) => (
                  <PatientCard
                    key={p.id}
                    patient={p}
                    delay={i * 0.04}
                    onView={(pt) => navigate(`/patients/${pt.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  )
}