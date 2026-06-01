import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft, Edit, Phone, Mail, Calendar,
  FileText, Clock, DollarSign, Paperclip, Download,
  ClipboardList, Activity, CreditCard, Plus,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SectionCard } from '@/components/ui/SectionCard'
import { InfoGrid } from '@/components/ui/InfoGrid'
import { Loader } from '@/components/ui/Loader'
import { EmptyState } from '@/components/ui/EmptyState'
import { PatientInfoSection } from '@/components/patients/PatientInfoSection'
import { MedicalTimeline } from '@/components/patients/MedicalTimeline'
import { AddTimelineNoteModal } from '@/components/patients/AddTimelineNoteModal'
import { UploadFilesModal } from '@/components/patients/UploadFilesModal'
import type { Attachment } from '@/types'
import { usePatientStore } from '@/store/patientStore'
import { downloadAttachment } from '@/services/patientService'
import { formatDate, formatCurrency } from '@/utils/format'
import { cn } from '@/utils/cn'
import { ROUTES } from '@/constants/routes'

type Tab = 'overview' | 'history' | 'attachments' | 'finance'

const TABS_CONFIG: { id: Tab; labelKey: string; icon: React.ReactNode }[] = [
  { id: 'overview',    labelKey: 'patients.recentActivity', icon: <ClipboardList size={15} /> },
  { id: 'history',     labelKey: 'patients.medicalHistory', icon: <Activity size={15} /> },
  { id: 'attachments', labelKey: 'patients.attachments',    icon: <Paperclip size={15} /> },
  { id: 'finance',     labelKey: 'nav.finance',             icon: <CreditCard size={15} /> },
]

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { getPatientById, getHistoryByPatientId, addHistoryEntry, loadPatientById } = usePatientStore()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [localAttachments, setLocalAttachments] = useState<Attachment[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [fetching, setFetching] = useState(true)

  const patient = getPatientById(id ?? '')

  // Fetch from API if not in store (e.g. after a page refresh)
  useEffect(() => {
    if (!id) { setFetching(false); return }
    if (patient) { setFetching(false); return }
    setFetching(true)
    loadPatientById(id)
      .catch(() => setFetchError('Patient not found'))
      .finally(() => setFetching(false))
  }, [id])
  const history = getHistoryByPatientId(id ?? '')

  if (!patient) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        {fetching ? (
          <Loader />
        ) : (
          <EmptyState
            title="Patient not found"
            description={fetchError ?? "This patient record doesn't exist or has been removed."}
            action={<Button onClick={() => navigate(ROUTES.PATIENTS)}>{t('patients.backToPatients')}</Button>}
          />
        )}
      </div>
    )
  }

  const fullName = `${patient.firstName} ${patient.lastName}`
  const age = patient.dateOfBirth
    ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  const allAttachments = [...history.flatMap((h) => h.attachments ?? []), ...localAttachments]
  const totalSpent = history.reduce((sum, h) => sum + (h.cost ?? 0), 0)
  const completedTreatments = history.filter((h) => h.status === 'completed').length

  return (
    <div>
      <PageHeader
        title={fullName}
        subtitle={`${patient.patientCode} · ${patient.assignedDoctor ?? 'Unassigned'}`}
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Patients', href: ROUTES.PATIENTS },
          { label: fullName },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" leftIcon={<Edit size={14} />}
              onClick={() => navigate(`/patients/${patient.id}/edit`)}>
              Edit
            </Button>
            <Button variant="ghost" size="sm"
              onClick={() => navigate(`/patients/${patient.id}/odontogram`)}>
              🦷 Odontogram
            </Button>
          </div>
        }
      />

      {/* ── Profile Hero ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          background: 'linear-gradient(135deg, rgba(97,190,197,0.18) 0%, rgba(97,190,197,0.06) 50%, #ffffff 100%)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid rgba(97,190,197,0.22)',
          boxShadow: '0 4px 20px -4px rgba(97,190,197,0.18), 0 1px 3px 0 rgba(0,0,0,0.04)',
          marginBottom: '1.5rem',
          padding: '1.5rem',
        }}
      >
        {/* ── Avatar + name + buttons row ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.25rem', flexWrap: 'wrap' }}>

          {/* Left: avatar + text */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <Avatar
                name={fullName}
                src={patient.avatar}
                size="xl"
                style={{
                  boxShadow: 'var(--shadow-card)',
                  border: '3px solid var(--color-surface-container-lowest)',
                }}
              />
              <div style={{ position: 'absolute', bottom: 0, right: 0 }}>
                <StatusBadge status={patient.status} />
              </div>
            </div>

            {/* Name + meta */}
            <div>
              <h2 style={{
                fontFamily: 'Manrope, sans-serif',
                fontSize: '1.5rem',
                fontWeight: 800,
                color: '#0c2d2f',
                lineHeight: 1.25,
                marginBottom: '0.3rem',
              }}>
                {fullName}
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem', color: '#475569' }}>
                <span style={{ fontFamily: 'monospace', color: 'var(--color-primary)', fontWeight: 600 }}>{patient.patientCode}</span>
                {age && (<><span style={{ opacity: 0.4 }}>·</span><span>{age} yrs</span></>)}
                {patient.gender && (<><span style={{ opacity: 0.4 }}>·</span><span>{patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)}</span></>)}
                {patient.bloodType && (
                  <>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <span style={{ background: 'var(--color-error-container)', color: 'var(--color-error)', padding: '0.1rem 0.5rem', borderRadius: 9999, fontSize: '0.75rem', fontWeight: 700 }}>
                      {patient.bloodType}
                    </span>
                  </>
                )}
                {patient.assignedDoctor && (<><span style={{ opacity: 0.4 }}>·</span><span style={{ color: '#334155' }}>{patient.assignedDoctor}</span></>)}
              </div>
            </div>
          </div>

          {/* Right: Call / Email buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
            {patient.phone && (
              <a href={`tel:${patient.phone}`}>
                <Button variant="outline" size="sm" leftIcon={<Phone size={14} />}>Call</Button>
              </a>
            )}
            {patient.email && (
              <a href={`mailto:${patient.email}`}>
                <Button variant="ghost" size="sm" leftIcon={<Mail size={14} />}>Email</Button>
              </a>
            )}
          </div>
        </div>

        {/* ── Quick stats — 4-card grid ── */}
          <div
            className="patient-stats-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: '1rem',
              marginTop: '1.5rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid rgba(189,201,201,0.15)',
            }}
          >
            {[
              { label: 'Last Visit',  value: patient.lastVisit ? formatDate(patient.lastVisit) : 'Never',                    icon: <Calendar size={15} />,   color: 'var(--color-primary)' },
              { label: 'Next Appt',   value: patient.nextAppointment ? formatDate(patient.nextAppointment) : 'Not scheduled', icon: <Clock size={15} />,      color: 'var(--color-secondary)' },
              { label: 'Total Spent', value: formatCurrency(totalSpent),                                                      icon: <DollarSign size={15} />, color: 'var(--color-tertiary)' },
              { label: 'Treatments',  value: `${completedTreatments} completed`,                                              icon: <FileText size={15} />,   color: 'var(--color-primary)' },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: 'var(--color-surface-container-low)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid rgba(189,201,201,0.15)',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <div style={{
                  width: '2.5rem', height: '2.5rem', flexShrink: 0,
                  borderRadius: 'var(--radius-DEFAULT)',
                  background: `color-mix(in srgb, ${s.color} 12%, transparent)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: s.color,
                }}>
                  {s.icon}
                </div>
                <div>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)', marginBottom: '0.2rem' }}>
                    {s.label}
                  </p>
                  <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-on-surface)', lineHeight: 1.2 }}>
                    {s.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
      </motion.div>

      {/* Responsive: stack stats to 2 cols on small screens */}
      <style>{`
        @media (max-width: 767px) {
          .patient-stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
      `}</style>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 bg-[var(--color-surface-container-low)] rounded-[var(--radius-lg)] p-1 mb-6 overflow-x-auto">
        {TABS_CONFIG.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-[var(--radius-DEFAULT)] text-sm font-medium transition-all duration-200 whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-[var(--color-surface-container-lowest)] text-[var(--color-primary)] shadow-[var(--shadow-card)]'
                : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'
            )}
          >
            {tab.icon}
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start' }} className="patient-overview-grid">
              <div>
                <PatientInfoSection patient={patient} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Recent history preview */}
                <SectionCard
                  title="Recent Activity"
                  icon={<Activity size={15} />}
                  action={
                    <Button variant="ghost" size="xs" onClick={() => setActiveTab('history')}>
                      View All
                    </Button>
                  }
                  delay={0.1}
                >
                  <MedicalTimeline entries={history.slice(0, 3)} />
                </SectionCard>

                {/* Notes */}
                {patient.notes && (
                  <SectionCard title="Clinical Notes" icon={<FileText size={15} />} delay={0.15}>
                    <p className="text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
                      {patient.notes}
                    </p>
                  </SectionCard>
                )}
              </div>
            </div>
          )}

          {/* Responsive: stack overview on small screens */}
          <style>{`
            @media (max-width: 1023px) {
              .patient-overview-grid { grid-template-columns: 1fr !important; }
            }
          `}</style>

          {/* MEDICAL HISTORY */}
          {activeTab === 'history' && (
            <div className="max-w-3xl">
              <SectionCard
                title={t('patients.medicalHistory')}
                icon={<Activity size={15} />}
                action={
                  <Button
                    size="sm"
                    leftIcon={<Plus size={14} />}
                    onClick={() => setNoteModalOpen(true)}
                  >
                    {t('patients.addNote')}
                  </Button>
                }
                delay={0}
              >
                <MedicalTimeline entries={history} />
              </SectionCard>
            </div>
          )}

          {/* ATTACHMENTS */}
          {activeTab === 'attachments' && (
            <SectionCard
              title={t('patients.attachments')}
              icon={<Paperclip size={15} />}
              action={
                <Button
                  size="sm"
                  leftIcon={<Plus size={14} />}
                  onClick={() => setUploadModalOpen(true)}
                >
                  {t('common.upload')}
                </Button>
              }
              delay={0}
            >
              {allAttachments.length === 0 ? (
                <EmptyState
                  icon={<Paperclip size={28} />}
                  title={t('patients.noAttachments')}
                  description={t('patients.attachmentsDesc')}
                  action={
                    <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setUploadModalOpen(true)}>
                      {t('common.upload')}
                    </Button>
                  }
                />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1rem' }} className="attachments-grid">
                  {allAttachments.map((att) => (
                    <motion.div
                      key={att.id}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-3 p-4 bg-[var(--color-surface-container-low)] rounded-[var(--radius-md)] border border-[var(--color-outline-variant)]/15 hover:border-[var(--color-primary)]/30 transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-[var(--radius-DEFAULT)] bg-[var(--color-primary-container)]/20 flex items-center justify-center text-[var(--color-primary)] shrink-0 text-lg">
                        {att.type === 'xray' ? '🩻' : att.type === 'pdf' ? '📄' : att.type === 'image' ? '🖼' : '📎'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--color-on-surface)] truncate">{att.name}</p>
                        <p className="text-xs text-[var(--color-on-surface-variant)]">{att.size} · {formatDate(att.uploadedAt)}</p>
                      </div>
                      <button
                        onClick={() => downloadAttachment(patient.id, att.id, att.name)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded text-[var(--color-primary)] hover:bg-[var(--color-primary-container)]/20"
                        title="Download file"
                        aria-label="Download file"
                      >
                        <Download size={14} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </SectionCard>
          )}

          <style>{`
            @media (max-width: 1023px) { .attachments-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; } }
            @media (max-width: 639px)  { .attachments-grid { grid-template-columns: 1fr !important; } }
          `}</style>

          {/* FINANCE */}
          {activeTab === 'finance' && (
            <div className="space-y-5">
              {/* Summary cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1rem' }} className="patient-finance-grid">
                {[
                  { label: t('patients.totalBilled'),  value: formatCurrency(totalSpent),                                                    color: 'text-[var(--color-primary)]' },
                  { label: t('patients.outstanding'),  value: formatCurrency(patient.balance ?? 0),                                          color: patient.balance ? 'text-[var(--color-error)]' : 'text-[var(--color-secondary)]' },
                  { label: t('common.paid'),           value: formatCurrency(totalSpent - (patient.balance ?? 0)),                           color: 'text-[var(--color-secondary)]' },
                ].map((s) => (
                  <div key={s.label} className="bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-lg)] border border-[var(--color-outline-variant)]/20 shadow-[var(--shadow-card)] p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{s.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Treatment cost breakdown */}
              <SectionCard title={t('patients.treatmentCost')} icon={<DollarSign size={15} />} delay={0.1}>
                {history.filter((h) => h.cost).length === 0 ? (
                  <EmptyState title={t('patients.noBilling')} description={t('patients.noBillingDesc')} />
                ) : (
                  <div className="space-y-3">
                    {history.filter((h) => h.cost).map((h, i) => (
                      <motion.div
                        key={h.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: i * 0.05 }}
                        className="flex items-center justify-between py-3 border-b border-[var(--color-outline-variant)]/10 last:border-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[var(--color-on-surface)]">{h.title}</p>
                          <p className="text-xs text-[var(--color-on-surface-variant)]">{formatDate(h.date)} · {h.doctor}</p>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-sm font-bold text-[var(--color-on-surface)]">{formatCurrency(h.cost!)}</p>
                          {h.status && (
                            <Badge
                              variant={h.status === 'completed' ? 'success' : h.status === 'scheduled' ? 'primary' : 'neutral'}
                              size="sm"
                            >
                              {h.status}
                            </Badge>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Add Timeline Note Modal */}
      <AddTimelineNoteModal
        open={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        patientId={patient.id}
        onSave={(entry) => {
          addHistoryEntry(entry)
          setNoteModalOpen(false)
        }}
      />

      {/* Upload Files Modal */}
      <UploadFilesModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={(attachments) => {
          setLocalAttachments((prev) => [...prev, ...attachments])
          setUploadModalOpen(false)
        }}
        uploadedBy={patient.assignedDoctor ?? 'Dr. Smith'}
      />
    </div>
  )
}
