import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { PatientForm, type PatientFormValues } from '@/components/patients/PatientForm'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { usePatientStore } from '@/store/patientStore'
import { ApiError } from '@/services/apiClient'
import { ROUTES } from '@/constants/routes'

export default function EditPatientPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { getPatientById, updatePatientById } = usePatientStore()
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const patient = getPatientById(id ?? '')

  if (!patient) {
    return (
      <EmptyState
        title={t('patients.patientNotFound')}
        action={<Button onClick={() => navigate(ROUTES.PATIENTS)}>{t('patients.backToPatients')}</Button>}
      />
    )
  }

  const handleSubmit = async (data: PatientFormValues) => {
    setLoading(true)
    setApiError(null)
    try {
      await updatePatientById(patient.id, {
        first_name: data.firstName,
        last_name: data.lastName,
        date_of_birth: data.dateOfBirth,
        gender: data.gender,
        national_id: data.nationalId,
        phone: data.phone,
        email: data.email || null,
        city: data.city || null,
        medical_history: data.medicalHistory || null,
        clinical_notes: data.clinicalNotes || null,
        insurance_provider: data.insuranceProvider || null,
        insurance_policy_number: data.insurancePolicyNumber || null,
        emergency_contact_name: data.emergencyContactName || null,
        emergency_contact_relationship: data.emergencyContactRelationship || null,
        emergency_contact_phone: data.emergencyContactPhone || null,
        status: data.status,
      })
      navigate(`${ROUTES.PATIENTS}/${patient.id}`)
    } catch (err) {
      if (err instanceof ApiError) {
        setApiError(err.message)
      } else {
        setApiError(t('patients.updateFailed'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        title={t('patients.editPatientTitle', { name: `${patient.firstName} ${patient.lastName}` })}
        subtitle={patient.patientCode}
        breadcrumb={[
          { label: t('nav.dashboard'), href: '/' },
          { label: t('nav.patients'), href: ROUTES.PATIENTS },
          { label: `${patient.firstName} ${patient.lastName}`, href: `${ROUTES.PATIENTS}/${patient.id}` },
          { label: t('common.edit') },
        ]}
      />
      {apiError && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.75rem 1rem',
          background: 'var(--color-error-container)',
          color: 'var(--color-on-error-container)',
          borderRadius: 'var(--radius-DEFAULT)',
          fontSize: '0.875rem',
        }}>
          {apiError}
        </div>
      )}
      <div className="max-w-4xl">
        <PatientForm
          initialData={patient}
          onSubmit={handleSubmit}
          loading={loading}
        />
      </div>
    </div>
  )
}
