import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { TimeSlot } from './TimeSlot'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import type { Appointment } from '@/types'

interface ScheduleWidgetProps {
  date: string
  appointments: Appointment[]
  onDateChange?: (date: string) => void
  onSlotClick?: (hour: number) => void
  onSlotAddClick?: (startTime: string) => void
  onAppointmentClick?: (a: Appointment) => void
  onAddClick?: () => void
  hours?: number[]
  className?: string
}

const WORK_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]

export function ScheduleWidget({
  date, appointments, onDateChange, onSlotClick, onSlotAddClick, onAppointmentClick, onAddClick,
  hours = WORK_HOURS, className,
}: ScheduleWidgetProps) {
  const { t } = useTranslation()
  const dt = new Date(date + 'T00:00:00')
  const isToday = date === new Date().toISOString().split('T')[0]

  const prev = () => {
    const d = new Date(dt); d.setDate(d.getDate() - 1)
    onDateChange?.(d.toISOString().split('T')[0])
  }
  const next = () => {
    const d = new Date(dt); d.setDate(d.getDate() + 1)
    onDateChange?.(d.toISOString().split('T')[0])
  }

  const getApptsByHour = (h: number) =>
    appointments.filter((a) => {
      const start = parseInt(a.startTime.split(':')[0])
      return start === h
    })

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-outline-variant)]/20">
        <div className="flex items-center gap-2">
          <button onClick={prev} className="p-1.5 rounded-[var(--radius-DEFAULT)] hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] transition-colors">
            <ChevronLeft size={16} />
          </button>
          <div className="text-center">
            <p className={cn('text-sm font-bold', isToday ? 'text-[var(--color-primary)]' : 'text-[var(--color-on-surface)]')}>
              {dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              {isToday && <span className="ml-2 text-[10px] font-semibold bg-[var(--color-primary)] text-white px-1.5 py-0.5 rounded-full">{t('common.today').toUpperCase()}</span>}
            </p>
            <p className="text-[11px] text-[var(--color-on-surface-variant)]">{appointments.length} {appointments.length !== 1 ? t('nav.calendar') : t('nav.calendar')}</p>
          </div>
          <button onClick={next} className="p-1.5 rounded-[var(--radius-DEFAULT)] hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
        {onAddClick && (
          <Button size="sm" leftIcon={<Plus size={14} />} onClick={onAddClick}>{t('common.add')}</Button>
        )}
      </div>

      {/* Time slots */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5">
        {hours.map((h) => (
          <TimeSlot
            key={h}
            hour={h}
            appointments={getApptsByHour(h)}
            onSlotClick={onSlotClick}
            onSlotAddClick={onSlotAddClick}
            onAppointmentClick={onAppointmentClick}
          />
        ))}
      </div>
    </div>
  )
}
