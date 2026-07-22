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

/** Format a Date → 'YYYY-MM-DD' using local time (avoids UTC midnight shift). */
function toLocalDateStr(d: Date): string {
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

/** Today's date string in local time. */
function todayLocalStr(): string {
  return toLocalDateStr(new Date())
}

export function ScheduleWidget({
  date, appointments, onDateChange, onSlotClick, onSlotAddClick, onAppointmentClick, onAddClick,
  hours = WORK_HOURS, className,
}: ScheduleWidgetProps) {
  const { t, i18n } = useTranslation()

  // Parse the date string as local midnight to avoid UTC off-by-one.
  const dt = new Date(date + 'T00:00:00')
  const isToday = date === todayLocalStr()

  const prev = () => {
    const d = new Date(date + 'T00:00:00')
    d.setDate(d.getDate() - 1)
    onDateChange?.(toLocalDateStr(d))
  }

  const next = () => {
    const d = new Date(date + 'T00:00:00')
    d.setDate(d.getDate() + 1)
    onDateChange?.(toLocalDateStr(d))
  }

  const getApptsByHour = (h: number) =>
    appointments.filter((a) => {
      const start = parseInt(a.startTime.split(':')[0])
      return start === h
    })

  return (
    <div className={cn('flex flex-col min-w-0 w-full', className)}>

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-[var(--color-outline-variant)] border-opacity-20">

        {/* Left cluster: prev arrow + date label + next arrow */}
        <div className="flex items-center gap-1 min-w-0">

          {/* Prev day */}
          <button
            type="button"
            onClick={prev}
            aria-label="Previous day"
            className="
              flex-shrink-0 flex items-center justify-center
              w-7 h-7 rounded-md
              text-[var(--color-on-surface-variant)]
              hover:bg-[var(--color-surface-container-high)]
              active:scale-95
              transition-colors duration-150
              cursor-pointer
            "
          >
            <ChevronLeft size={15} />
          </button>

          {/* Date + count */}
          <div className="flex flex-col min-w-0 px-1">
            <span
              className={cn(
                'text-sm font-semibold leading-tight whitespace-nowrap',
                isToday
                  ? 'text-[var(--color-primary)]'
                  : 'text-[var(--color-on-surface)]'
              )}
            >
              {dt.toLocaleDateString(i18n.language, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
              {isToday && (
                <span className="ml-2 inline-flex items-center text-[9px] font-bold bg-[var(--color-primary)] text-white px-1.5 py-0.5 rounded-full align-middle">
                  {t('calendar.today').toUpperCase()}
                </span>
              )}
            </span>
            <span className="text-[11px] text-[var(--color-on-surface-variant)] leading-tight">
              {t('calendar.appointmentsCount', { count: appointments.length })}
            </span>
          </div>

          {/* Next day */}
          <button
            type="button"
            onClick={next}
            aria-label="Next day"
            className="
              flex-shrink-0 flex items-center justify-center
              w-7 h-7 rounded-md
              text-[var(--color-on-surface-variant)]
              hover:bg-[var(--color-surface-container-high)]
              active:scale-95
              transition-colors duration-150
              cursor-pointer
            "
          >
            <ChevronRight size={15} />
          </button>

        </div>

        {/* Right: Add button */}
        {onAddClick && (
          <Button
            size="sm"
            leftIcon={<Plus size={13} />}
            onClick={onAddClick}
            className="flex-shrink-0"
          >
            {t('common.add')}
          </Button>
        )}
      </div>

      {/* ── Time slots ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5 min-h-0">
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
