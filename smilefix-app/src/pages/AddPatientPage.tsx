import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { PatientForm } from '@/components/patients/PatientForm'
import { usePatientStore } from '@/store/patientStore'
import { ROUTES } from '@/constants/routes'
import type { Patient } from '@/types'

export default function AddPatientPage() {
  const navigate = useNavigate()
  const { addPatient, patients } = usePatientStore()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (data: Omit<Patient, 'id' | 'patientCode' | 'createdAt'>) => {
    setLoading(true)
    await new Promise((r) => setTimeout(r, 600))

    const newPatient: Patient = {
      ...data,
      id: String(Date.now()),
      patientCode: `SF-${String(patients.length + 1).padStart(5, '0')}`,
      createdAt: new Date().toISOString().split('T')[0],
    }

    addPatient(newPatient)
    setLoading(false)
    navigate(`/patients/${newPatient.id}`)
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
