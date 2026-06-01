import { useTranslation } from 'react-i18next'
import { Phone, MapPin, User, Shield, Stethoscope } from 'lucide-react'
import { InfoGrid } from '@/components/ui/InfoGrid'
import { SectionCard } from '@/components/ui/SectionCard'
import type { Patient } from '@/types'

interface PatientInfoSectionProps {
  patient: Patient
  delay?: number
}

export function PatientInfoSection({ patient, delay = 0 }: PatientInfoSectionProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      {/* Personal Info */}
      <SectionCard title={t('patients.personalInfo')} icon={<User size={15} />} delay={delay}>
        <InfoGrid
          cols={2}
          items={[
            { label: t('patients.fullName'),    value: `${patient.firstName} ${patient.lastName}` },
            { label: t('patients.patientCode'), value: <span className="font-mono text-[var(--color-primary)]">{patient.patientCode}</span> },
            { label: t('patients.gender'),      value: patient.gender },
            { label: t('patients.phone'),       value: patient.phone },
            { label: t('patients.city'),        value: patient.city || '—' },
            { label: t('patients.email'),       value: patient.email || '—' },
          ]}
        />
      </SectionCard>

      {/* Clinical Notes & Medical History */}
      <SectionCard title={t('patients.clinicalInfo')} icon={<Stethoscope size={15} />} delay={delay + 0.05}>
        <InfoGrid
          cols={1}
          items={[
            { label: t('patients.clinicalNotes'),  value: patient.clinicalNotes || '—' },
            { label: t('patients.medicalHistory'), value: patient.medicalHistory || '—' },
          ]}
        />
      </SectionCard>

      {/* Insurance */}
      {(patient.insuranceProvider || patient.insurancePolicyNumber) && (
        <SectionCard title={t('patients.insuranceInfo')} icon={<Shield size={15} />} delay={delay + 0.1}>
          <InfoGrid
            cols={2}
            items={[
              { label: t('patients.insuranceProvider'), value: patient.insuranceProvider || '—' },
              { label: t('patients.policyNumber'),      value: patient.insurancePolicyNumber || '—' },
            ]}
          />
        </SectionCard>
      )}

      {/* Emergency Contact */}
      {patient.emergencyContactName && (
        <SectionCard title={t('patients.emergencyContact')} icon={<Phone size={15} />} delay={delay + 0.15}>
          <InfoGrid
            cols={2}
            items={[
              { label: t('common.name'),            value: patient.emergencyContactName },
              { label: t('patients.relationship'),  value: patient.emergencyContactRelationship || '—' },
              { label: t('common.phone'),            value: (
                <a href={`tel:${patient.emergencyContactPhone}`} className="flex items-center gap-1 text-[var(--color-primary)] hover:underline">
                  {patient.emergencyContactPhone}
                </a>
              )},
            ]}
          />
        </SectionCard>
      )}
    </div>
  )
}