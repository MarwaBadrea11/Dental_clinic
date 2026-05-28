import { useTranslation } from 'react-i18next'
import { Phone, Mail, MapPin, Heart, AlertTriangle, User, Shield } from 'lucide-react'
import { InfoGrid } from '@/components/ui/InfoGrid'
import { Badge } from '@/components/ui/Badge'
import { SectionCard } from '@/components/ui/SectionCard'
import { formatDate } from '@/utils/format'
import type { Patient } from '@/types'

interface PatientInfoSectionProps {
  patient: Patient
  delay?: number
}

export function PatientInfoSection({ patient, delay = 0 }: PatientInfoSectionProps) {
  const { t } = useTranslation()

  const age = patient.dateOfBirth
    ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  return (
    <div className="space-y-4">
      {/* Personal Info */}
      <SectionCard title={t('patients.personalInfo')} icon={<User size={15} />} delay={delay}>
        <InfoGrid
          cols={2}
          items={[
            { label: t('patients.fullName'),    value: `${patient.firstName} ${patient.lastName}` },
            { label: t('patients.patientCode'), value: <span className="font-mono text-[var(--color-primary)]">{patient.patientCode}</span> },
            { label: t('patients.dateOfBirth'), value: patient.dateOfBirth ? `${formatDate(patient.dateOfBirth)} (${t('patients.age')} ${age})` : null },
            { label: t('patients.gender'),      value: patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : null },
            { label: t('common.phone'),         value: patient.phone ? (
              <a href={`tel:${patient.phone}`} className="flex items-center gap-1 text-[var(--color-primary)] hover:underline">
                <Phone size={12} /> {patient.phone}
              </a>
            ) : null },
            { label: t('common.email'),         value: patient.email ? (
              <a href={`mailto:${patient.email}`} className="flex items-center gap-1 text-[var(--color-primary)] hover:underline truncate">
                <Mail size={12} /> {patient.email}
              </a>
            ) : null },
            { label: t('common.address'), span: 2, value: patient.address ? (
              <span className="flex items-center gap-1">
                <MapPin size={12} className="text-[var(--color-outline)] shrink-0" />
                {patient.address}{patient.city ? `, ${patient.city}` : ''}
              </span>
            ) : null },
          ]}
        />
      </SectionCard>

      {/* Medical Info */}
      <SectionCard title={t('patients.medicalInfo')} icon={<Heart size={15} />} delay={delay + 0.05}>
        <InfoGrid
          cols={2}
          items={[
            { label: t('patients.bloodType'),      value: patient.bloodType ? (
              <Badge variant="error" size="sm">{patient.bloodType}</Badge>
            ) : null },
            { label: t('patients.assignedDoctor'), value: patient.assignedDoctor },
            { label: t('patients.allergies'), span: 2, value: patient.allergies && patient.allergies.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {patient.allergies.map((a) => (
                  <span key={a} className="flex items-center gap-1 px-2 py-0.5 bg-[var(--color-error-container)] text-[var(--color-error)] text-xs font-semibold rounded-full">
                    <AlertTriangle size={10} /> {a}
                  </span>
                ))}
              </div>
            ) : <span className="text-[var(--color-secondary)] text-xs font-medium">{t('patients.noAllergies')}</span> },
          ]}
        />
      </SectionCard>

      {/* Insurance */}
      {(patient.insuranceProvider || patient.insuranceNumber) && (
        <SectionCard title={t('patients.insuranceInfo')} icon={<Shield size={15} />} delay={delay + 0.1}>
          <InfoGrid
            cols={2}
            items={[
              { label: t('patients.insuranceProvider'), value: patient.insuranceProvider },
              { label: t('patients.policyNumber'),      value: patient.insuranceNumber
                ? <span className="font-mono text-sm">{patient.insuranceNumber}</span>
                : null },
            ]}
          />
        </SectionCard>
      )}

      {/* Emergency Contact */}
      {patient.emergencyContact && (
        <SectionCard title={t('patients.emergencyContact')} icon={<Phone size={15} />} delay={delay + 0.15}>
          <InfoGrid
            cols={2}
            items={[
              { label: t('common.name'),            value: patient.emergencyContact.name },
              { label: t('patients.relationship'),  value: patient.emergencyContact.relation },
              { label: t('common.phone'),            value: (
                <a href={`tel:${patient.emergencyContact.phone}`} className="flex items-center gap-1 text-[var(--color-primary)] hover:underline">
                  <Phone size={12} /> {patient.emergencyContact.phone}
                </a>
              )},
            ]}
          />
        </SectionCard>
      )}
    </div>
  )
}
