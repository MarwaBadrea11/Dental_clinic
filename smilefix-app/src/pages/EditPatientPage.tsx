import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { PatientForm } from '@/components/patients/PatientForm'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { usePatientStore } from '@/store/patientStore'
import { ApiError } from '@/services/apiClient'
import { ROUTES } from '@/constants/routes'
import type { Patient } from '@/types'

export default function EditPatientPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getPatientById, updatePatientById } = usePatientStore()
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const patient = getPatientById(id ?? '')

  if (!patient) {
    return (
      <EmptyState
        title="Patient not found"
        action={<Button onClick={() => navigate(ROUTES.PATIENTS)}>Back to Patients</Button>}
      />
    )
  }

  const handleSubmit = async (data: Omit<Patient, 'id' | 'patientCode' | 'createdAt'>) => {
    setLoading(true)
    setApiError(null)
    try {
      await updatePatientById(patient.id, {
        first_name: data.firstName,
        last_name: data.lastName,
        date_of_birth: data.dateOfBirth,
        gender: data.gender,
        national_id: data.patientCode ?? patient.patientCode,
        phone: data.phone,
        email: data.email ?? null,
        address: data.address ?? null,
        blood_type: data.bloodType ?? null,
        allergies: data.allergies ?? [],
        medical_history: data.notes ?? null,
        emergency_contact_name: data.emergencyContact?.name ?? null,
        emergency_contact_phone: data.emergencyContact?.phone ?? null,
      })
      navigate(`/patients/${patient.id}`)
    } catch (err) {
      if (err instanceof ApiError) {
        setApiError(err.message)
      } else {
        setApiError('Failed to update patient. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        title={`Edit — ${patient.firstName} ${patient.lastName}`}
        subtitle={patient.patientCode}
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Patients', href: ROUTES.PATIENTS },
          { label: `${patient.firstName} ${patient.lastName}`, href: `/patients/${patient.id}` },
          { label: 'Edit' },
        ]}
      />
      {apiError && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'var(--color-error-container)', color: 'var(--color-on-error-container)', borderRadius: 'var(--radius-DEFAULT)', fontSize: '0.875rem' }}>
          {apiError}
        </div>
      )}
      <div className="max-w-4xl">
        <PatientForm
          mode="edit"
          initialData={patient}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/patients/${patient.id}`)}
          loading={loading}
        />
      </div>
    </div>
  )
}
