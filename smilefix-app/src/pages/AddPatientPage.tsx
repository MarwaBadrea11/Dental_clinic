import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { PatientForm } from '@/components/patients/PatientForm'
import { usePatientStore } from '@/store/patientStore'
import { ApiError } from '@/services/apiClient'
import { ROUTES } from '@/constants/routes'
import type { Patient } from '@/types'

export default function AddPatientPage() {
  const navigate = useNavigate()
  const { createPatient } = usePatientStore()
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const handleSubmit = async (data: Omit<Patient, 'id' | 'patientCode' | 'createdAt'>) => {
    setLoading(true)
    setApiError(null)
    try {
      const patient = await createPatient({
        first_name: data.firstName,
        last_name: data.lastName,
        date_of_birth: data.dateOfBirth,
        gender: data.gender,
        national_id: data.patientCode ?? `${data.firstName}-${Date.now()}`,
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
        setApiError('Failed to create patient. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Register New Patient"
        subtitle="Fill in the patient's information to create their record."
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Patients', href: ROUTES.PATIENTS },
          { label: 'New Patient' },
        ]}
      />
      {apiError && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'var(--color-error-container)', color: 'var(--color-on-error-container)', borderRadius: 'var(--radius-DEFAULT)', fontSize: '0.875rem' }}>
          {apiError}
        </div>
      )}
      <div className="max-w-4xl">
        <PatientForm
          mode="create"
          onSubmit={handleSubmit}
          onCancel={() => navigate(ROUTES.PATIENTS)}
          loading={loading}
        />
      </div>
    </div>
  )
}
