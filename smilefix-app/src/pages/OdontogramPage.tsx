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
import { getToothConditionLabel, buildToothLegendItems } from '@/i18n/patientOdontogramOptions'
import type { ToothCondition } from '@/types'

export default function OdontogramPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { getPatientById, loadPatientById } = usePatientStore()
  const { getOdontogram, syncToothToBackend, loadOdontogram, getPatientTreatments, updateToothCondition } = useTreatmentStore()
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [patientLoading, setPatientLoading] = useState(false)
  const [patientError, setPatientError] = useState(false)
  // Track which teeth have been changed locally but not yet confirmed saved
  const pendingRef = useRef<Map<number, { condition: ToothCondition; notes?: string }>>(new Map())

  // On hard refresh the Zustand store is empty — fetch the patient by ID directly
  useEffect(() => {
    if (!id) return
    const already = getPatientById(id)
    if (already) return          // already in store from normal navigation
    setPatientLoading(true)
    loadPatientById(id)
      .catch(() => setPatientError(true))
      .finally(() => setPatientLoading(false))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load real odontogram data on mount
  useEffect(() => {
    if (id) loadOdontogram(id)
  }, [id, loadOdontogram])

  const patient = getPatientById(id ?? '')
  const odontogram = getOdontogram(id ?? '')
  const patientTreatments = getPatientTreatments(id ?? '')

  // Still fetching the patient — show a neutral loading state
  if (patientLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--color-on-surface-variant)]">
        {t('patients.loadingPatient')}
      </div>
    )
  }

  if (patientError || !patient) {
    return (
      <EmptyState
        title={t('patients.patientNotFound')}
        action={<Button onClick={() => navigate(ROUTES.PATIENTS)}>{t('patients.backToPatients')}</Button>}
      />
    )
  }

  const handleUpdate = (toothNumber: number, condition: ToothCondition, notes?: string) => {
    // Queue the change locally — will be flushed on Save
    pendingRef.current.set(toothNumber, { condition, notes })
    // Update local store immediately so the chart re-renders without waiting for the API
    updateToothCondition(patient.id, toothNumber, condition, notes)
    setSaved(false)
  }

  const handleSave = async () => {
    if (!id || saving) return
    setSaving(true)
    setSaveError(null)
    try {
      const pending = Array.from(pendingRef.current.entries())
      if (pending.length === 0) {
        // Nothing changed — still reload to confirm DB state
        await loadOdontogram(id)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        return
      }
      // Persist every pending change to the backend (one PATCH per tooth)
      await Promise.all(
        pending.map(([toothNumber, { condition, notes }]) =>
          syncToothToBackend(id, toothNumber, condition, notes)
        )
      )
      pendingRef.current.clear()
      // Reload from DB to confirm what was actually persisted
      await loadOdontogram(id)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed. Please try again.'
      console.error('[odontogram] save failed:', err)
      setSaveError(msg)
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

  const legendItems = buildToothLegendItems(t)
  const legendBorder: Record<string, string> = {
    healthy: 'var(--color-outline-variant)',
    caries: 'var(--color-error)',
    filled: 'var(--color-secondary)',
    crown: 'var(--color-tertiary)',
    'root-canal': '#ea580c',
    missing: 'var(--color-outline)',
    implant: '#9d4edd',
  }

  return (
    <div>
      <PageHeader
        title={t('odontogram.title')}
        subtitle={`${fullName} · ${patient.patientCode}`}
        breadcrumb={[
          { label: t('nav.dashboard'), href: '/' },
          { label: t('nav.patients'), href: ROUTES.PATIENTS },
          { label: fullName, href: `/patients/${patient.id}` },
          { label: t('odontogram.title') },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft size={14} />}
              onClick={() => navigate(`/patients/${patient.id}`)}>
              {t('odontogram.backToPatient')}
            </Button>
            <Button size="sm" leftIcon={<Save size={14} />} onClick={handleSave}
              disabled={saving}
              className={saved ? 'bg-[var(--color-secondary)]' : saveError ? 'bg-[var(--color-error)]' : ''}>
              {saving ? t('odontogram.saving') : saved ? `${t('odontogram.saved')} ✓` : saveError ? t('odontogram.retrySave') : t('odontogram.saveChanges')}
            </Button>
          </div>
        }
      />

      {/* Save error banner */}
      {saveError && (
        <div className="mb-4 px-4 py-3 rounded-[var(--radius-DEFAULT)] bg-[var(--color-error-container)] text-[var(--color-error)] text-sm flex items-center justify-between">
          <span>⚠ {saveError}</span>
          <button onClick={() => setSaveError(null)} className="ml-4 text-xs opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

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
              {patient.patientCode} · {patient.assignedDoctor ?? t('patients.unassigned')}
              {patient.bloodType && ` · ${t('patients.bloodTypeLabel', { type: patient.bloodType })}`}
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
                  <p className="text-[10px] text-[var(--color-on-surface-variant)]">
                    {getToothConditionLabel(t, cond as ToothCondition)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      <div className="odontogram-layout grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main odontogram */}
        <div className="lg:col-span-8">
          <SectionCard
            title={t('odontogram.dentalChart')}
            subtitle={t('odontogram.chartSubtitle')}
            icon={<FileText size={15} />}
            action={
              <Button variant="ghost" size="xs" leftIcon={<RotateCcw size={12} />}>
                {t('odontogram.resetView')}
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
            <SectionCard title={t('odontogram.clinicalNotes')} icon={<FileText size={15} />} delay={0.1} className="mt-5">
              <p className="text-sm text-[var(--color-on-surface-variant)] leading-relaxed">{odontogram.notes}</p>
            </SectionCard>
          )}
        </div>

        {/* Right panel */}
        <div className="lg:col-span-4 space-y-5">
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
              {legendItems.map((item) => (
                <div key={item.condition} className="flex items-center gap-2.5">
                  <div
                    className="w-6 h-6 rounded border flex-shrink-0"
                    style={{
                      background: item.color,
                      borderColor: legendBorder[item.condition] ?? 'var(--color-outline-variant)',
                      borderWidth: '1.5px',
                    }}
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
