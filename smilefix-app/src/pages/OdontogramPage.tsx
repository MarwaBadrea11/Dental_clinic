import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Save, RotateCcw, FileText, Activity } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { OdontogramChart } from '@/components/odontogram'
import { TreatmentTimeline } from '@/components/treatments'
import { usePatientStore } from '@/store/patientStore'
import { useTreatmentStore } from '@/store/treatmentStore'
import { createOdontogram } from '@/services/odontogramService'
import { ROUTES } from '@/constants/routes'
import type { ToothCondition } from '@/types'

export default function OdontogramPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { getPatientById } = usePatientStore()
  const { getOdontogram, syncToothToBackend, loadOdontogram, getPatientTreatments } = useTreatmentStore()
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  // Track which teeth have been changed locally but not yet confirmed saved
  const pendingRef = useRef<Map<number, { condition: ToothCondition; notes?: string }>>(new Map())

  const patient = getPatientById(id ?? '')
  const odontogram = getOdontogram(id ?? '')
  const patientTreatments = getPatientTreatments(id ?? '')

  // Load real odontogram data on mount
  useEffect(() => {
    if (id) loadOdontogram(id)
  }, [id, loadOdontogram])

  if (!patient) {
    return (
      <EmptyState
        title="Patient not found"
        action={<Button onClick={() => navigate(ROUTES.PATIENTS)}>Back to Patients</Button>}
      />
    )
  }

  const handleUpdate = (toothNumber: number, condition: ToothCondition, notes?: string) => {
    // Queue the change locally — will be flushed on Save
    pendingRef.current.set(toothNumber, { condition, notes })
    // Also update local store immediately so the chart re-renders
    syncToothToBackend(patient.id, toothNumber, condition, notes).catch(console.error)
    setSaved(false)
  }

  const handleSave = async () => {
    if (!id || saving) return
    setSaving(true)
    try {
      // Flush all pending changes that haven't been confirmed yet
      const pending = Array.from(pendingRef.current.entries())
      if (pending.length > 0) {
        await Promise.all(
          pending.map(([toothNumber, { condition, notes }]) =>
            syncToothToBackend(id, toothNumber, condition, notes)
          )
        )
        pendingRef.current.clear()
      }
      // Reload from DB to confirm what was actually persisted
      await loadOdontogram(id)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('[odontogram] save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  // Initialise the chart by calling the dedicated POST endpoint — no tooth
  // write needed, so receptionists (odontogram:create) can do this too.
  const handleCreateChart = async () => {
    if (!id) return
    await createOdontogram(id).catch(console.error)
    await loadOdontogram(id)
  }

  const fullName = `${patient.firstName} ${patient.lastName}`

  // Tooth condition summary
  const conditionCounts = odontogram
    ? Object.values(odontogram.teeth).reduce<Record<string, number>>((acc, t) => {
        if (t.condition !== 'healthy') {
          acc[t.condition] = (acc[t.condition] ?? 0) + 1
        }
        return acc
      }, {})
    : {}

  return (
    <div>
      <PageHeader
        title="Odontogram"
        subtitle={`${fullName} · ${patient.patientCode}`}
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Patients', href: ROUTES.PATIENTS },
          { label: fullName, href: `/patients/${patient.id}` },
          { label: 'Odontogram' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft size={14} />}
              onClick={() => navigate(`/patients/${patient.id}`)}>
              Back to Patient
            </Button>
            <Button size="sm" leftIcon={<Save size={14} />} onClick={handleSave}
              disabled={saving}
              className={saved ? 'bg-[var(--color-secondary)]' : ''}>
              {saving ? 'Saving…' : saved ? `${t('odontogram.saved')} ✓` : t('odontogram.saveChanges')}
            </Button>
          </div>
        }
      />

      {/* Patient banner */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-lg)] border border-[var(--color-outline-variant)]/20 shadow-[var(--shadow-card)] p-5 mb-6"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Avatar name={fullName} src={patient.avatar} size="lg" ring />
          <div className="flex-1">
            <h2 className="font-bold text-base text-[var(--color-on-surface)]">{fullName}</h2>
            <p className="text-sm text-[var(--color-on-surface-variant)]">
              {patient.patientCode} · {patient.assignedDoctor ?? 'Unassigned'}
              {patient.bloodType && ` · Blood type ${patient.bloodType}`}
            </p>
            {patient.allergies && patient.allergies.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {patient.allergies.map((a) => (
                  <span key={a} className="px-2 py-0.5 bg-[var(--color-error-container)] text-[var(--color-error)] text-[10px] font-semibold rounded-full">
                    ⚠ {a}
                  </span>
                ))}
              </div>
            )}
          </div>
          {/* Condition summary */}
          {Object.keys(conditionCounts).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(conditionCounts).map(([cond, count]) => (
                <div key={cond} className="text-center bg-[var(--color-surface-container-low)] rounded-[var(--radius-DEFAULT)] px-3 py-2">
                  <p className="text-lg font-bold text-[var(--color-on-surface)]">{count}</p>
                  <p className="text-[10px] text-[var(--color-on-surface-variant)] capitalize">{cond.replace('-', ' ')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-12 gap-6">
        {/* Main odontogram */}
        <div className="col-span-12 lg:col-span-8">
          <SectionCard
            title={t('odontogram.dentalChart')}
            subtitle={t('odontogram.chartSubtitle')}
            icon={<FileText size={15} />}
            action={
              <Button variant="ghost" size="xs" leftIcon={<RotateCcw size={12} />}>
                Reset View
              </Button>
            }
            delay={0}
          >
            {odontogram ? (
              <OdontogramChart
                record={odontogram}
                editable
                onUpdate={handleUpdate}
              />
            ) : (
              <EmptyState
                title={t('odontogram.noRecord')}
                description={t('odontogram.noRecordDesc')}
                action={<Button size="sm" onClick={handleCreateChart}>{t('odontogram.createChart')}</Button>}
              />
            )}
          </SectionCard>

          {/* Clinical notes */}
          {odontogram?.notes && (
            <SectionCard title="Clinical Notes" icon={<FileText size={15} />} delay={0.1} className="mt-5">
              <p className="text-sm text-[var(--color-on-surface-variant)] leading-relaxed">{odontogram.notes}</p>
            </SectionCard>
          )}
        </div>

        {/* Right panel */}
        <div className="col-span-12 lg:col-span-4 space-y-5">
          {/* Treatment history */}
          <SectionCard
            title={t('odontogram.treatmentHistory')}
            icon={<Activity size={15} />}
            subtitle={`${patientTreatments.length} ${t('odontogram.procedures')}`}
            delay={0.1}
          >
            <TreatmentTimeline treatments={patientTreatments} />
          </SectionCard>

          {/* Tooth legend quick ref */}
          <SectionCard title={t('odontogram.conditionLegend')} delay={0.15}>
            <div className="space-y-2">
              {[
                { label: t('odontogram.healthy'),   color: '#ffffff',  border: 'var(--color-outline-variant)' },
                { label: t('odontogram.caries'),    color: '#ffdad6',  border: 'var(--color-error)' },
                { label: t('odontogram.filled'),    color: '#b6eadd',  border: 'var(--color-secondary)' },
                { label: t('odontogram.crown'),     color: '#c7e7ff',  border: 'var(--color-tertiary)' },
                { label: t('odontogram.rootCanal'), color: '#fde8d8',  border: '#ea580c' },
                { label: t('odontogram.missing'),   color: '#e5e9ec',  border: 'var(--color-outline)' },
                { label: t('odontogram.implant'),   color: '#e8d5ff',  border: '#9d4edd' },
                { label: t('odontogram.bridge'),    color: '#fef3c7',  border: '#d97706' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <div
                    className="w-6 h-6 rounded border flex-shrink-0"
                    style={{ background: item.color, borderColor: item.border, borderWidth: '1.5px' }}
                  />
                  <span className="text-xs text-[var(--color-on-surface)]">{item.label}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
