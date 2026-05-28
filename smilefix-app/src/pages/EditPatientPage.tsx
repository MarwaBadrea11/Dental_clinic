import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { PatientForm } from '@/components/patients/PatientForm'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { usePatientStore } from '@/store/patientStore'
import { ROUTES } from '@/constants/routes'
import type { Patient } from '@/types'

export default function EditPatientPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getPatientById, updatePatient } = usePatientStore()
  const [loading, setLoading] = useState(false)

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
    await new Promise((r) => setTimeout(r, 600))
    updatePatient(patient.id, data)
    setLoading(false)
    navigate(`/patients/${patient.id}`)
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
