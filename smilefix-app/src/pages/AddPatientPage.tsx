import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { PatientForm, type PatientFormValues } from '@/components/patients/PatientForm'
import { usePatientStore } from '@/store/patientStore'
import { ApiError } from '@/services/apiClient'
import { ROUTES } from '@/constants/routes'

export default function AddPatientPage() {
  const navigate = useNavigate()
  const { createPatient } = usePatientStore()
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const handleSubmit = async (data: PatientFormValues) => {
    setLoading(true)
    setApiError(null)
    try {
      const patient = await createPatient({
        first_name: data.firstName,
        last_name: data.lastName,
        date_of_birth: data.dateOfBirth,
        gender: data.gender,
        national_id: data.nationalId,
        phone: data.phone,
        email: data.email || null,
        address: null,
        city: data.city || null,
        blood_type: null,
        allergies: [],
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
        <div style={{ 
          marginBottom: '1rem', 
          padding: '0.75rem 1rem', 
          background: 'var(--color-error-container)', 
          color: 'var(--color-on-error-container)', 
          borderRadius: 'var(--radius-DEFAULT)', 
          fontSize: '0.875rem' 
        }}>
          {apiError}
        </div>
      )}
      <div className="max-w-4xl">
        <PatientForm onSubmit={handleSubmit} loading={loading} />
      </div>
    </div>
  )
}