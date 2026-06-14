import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { CalendarDays, CalendarRange, CheckCircle2, Hourglass, List, LayoutGrid, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageStatsGrid } from '@/components/shared/PageStatsGrid'
import { SectionCard } from '@/components/ui/SectionCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataTable, type DataTableColumn, type DataTableAction } from '@/components/ui/DataTable'
import { Avatar } from '@/components/ui/Avatar'
import {
  AppointmentCard, AppointmentStatusBadge, AppointmentViewModal,
  AppointmentFormModal, ScheduleWidget, CalendarCell,
} from '@/components/appointments'
import { useAppointmentStore } from '@/store/appointmentStore'
import { ApiError } from '@/services/apiClient'
import { cn } from '@/utils/cn'
import {
  getAppointmentTreatmentLabel,
  getWeekdayShortLabels,
} from '@/i18n/appointmentOptions'
import type { Appointment, AppointmentStatus } from '@/types'

type ViewMode = 'week' | 'day' | 'list'

const VIEW_MODE_KEYS: Record<ViewMode, string> = {
  week: 'calendar.week',
  day:  'calendar.day',
  list: 'calendar.list',
}

export default function CalendarPage() {
  const { t, i18n } = useTranslation()
  const weekdayLabels = getWeekdayShortLabels(i18n.language)
  const {
    appointments, stats, selectedDate, viewMode,
    setSelectedDate, setViewMode,
    addAppointment, updateAppointment, deleteAppointment, getByDate, getByWeek,
    loadAppointments, updateAppointmentStatus, removeAppointment,
    error: loadError,
  } = useAppointmentStore()

  const [viewAppt, setViewAppt] = useState<Appointment | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editAppt, setEditAppt] = useState<Appointment | undefined>()
  const [listSearch, setListSearch] = useState('')
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [bookingLoading, setBookingLoading] = useState(false)

  // Load real appointments from the backend on mount
  useEffect(() => {
    loadAppointments()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Week grid helpers
  const getWeekStart = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    const day = d.getDay()
    d.setDate(d.getDate() - day)
    return d
  }
  const weekStart = getWeekStart(selectedDate)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })
  const prevWeek = () => {
    const d = new Date(weekStart); d.setDate(d.getDate() - 7)
    setSelectedDate(d.toISOString().split('T')[0])
  }
  const nextWeek = () => {
    const d = new Date(weekStart); d.setDate(d.getDate() + 7)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const todayAppts = getByDate(selectedDate)
  const weekAppts = getByWeek(weekStart.toISOString().split('T')[0])

  const handleStatusChange = (id: string, status: AppointmentStatus) => {
    // Optimistic local update + persist to backend
    updateAppointmentStatus(id, status).catch(() => {/* error handled in store */})
    if (viewAppt?.id === id) setViewAppt((a) => a ? { ...a, status } : null)
  }

  const handleSaveNew = async (data: Omit<Appointment, 'id'>) => {
    setBookingError(null)
    setBookingLoading(true)
    try {
      // Build ISO datetime from date + startTime
      const scheduledAt = `${data.date}T${data.startTime}:00+00:00`
      // Derive duration from start/end times
      const [sh, sm] = data.startTime.split(':').map(Number)
      const [eh, em] = data.endTime.split(':').map(Number)
      const duration_minutes = (eh * 60 + em) - (sh * 60 + sm)

      await useAppointmentStore.getState().bookAppointment({
        patient_id:       data.patientId,
        dentist_id:       data.doctorId,
        scheduled_at:     scheduledAt,
        duration_minutes: duration_minutes > 0 ? duration_minutes : 30,
        chair_number:     data.chair ? String(data.chair) : '1',
        treatment_name:   data.treatment || null,
        notes:            data.notes ?? null,
      })

      setShowForm(false)
      setEditAppt(undefined)
    } catch (err) {
      if (err instanceof ApiError) {
        setBookingError(err.message)
      } else {
        setBookingError(t('calendar.bookFailed'))
      }
    } finally {
      setBookingLoading(false)
    }
  }

  const handleSlotAdd = (startTime: string) => {
    // Pre-fill start time; compute a default 1-hour end time
    const [h, m] = startTime.split(':').map(Number)
    const endHour = String(h + 1).padStart(2, '0')
    const endTime = `${endHour}:${String(m).padStart(2, '0')}`
    setEditAppt({ startTime, endTime } as Appointment)
    setShowForm(true)
  }

  // List columns
  const columns: DataTableColumn<Appointment>[] = [
    {
      key: 'patient', header: t('common.patient'), sortable: true,
      render: (a) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={a.patientName} size="sm" />
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{a.patientName}</p>
            <p className="text-xs text-[var(--color-on-surface-variant)]">{a.patientCode}</p>
          </div>
        </div>
      ),
    },
    { key: 'date',        header: t('common.date'),      sortable: true, render: (a) => <span className="text-sm">{new Date(a.date + 'T00:00:00').toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' })}</span> },
    { key: 'time',        header: t('calendar.time'),    render: (a) => <span className="text-sm font-mono">{a.startTime} – {a.endTime}</span> },
    { key: 'treatment',   header: t('patients.treatment'), sortable: true, render: (a) => <span className="text-sm">{getAppointmentTreatmentLabel(t, a.treatment)}</span> },
    { key: 'doctorName',  header: t('common.doctor'),    sortable: true, render: (a) => <span className="text-sm">{a.doctorName}</span> },
    { key: 'status',      header: t('common.status'),    sortable: true, render: (a) => <AppointmentStatusBadge status={a.status} /> },
  ]

  const actions: DataTableAction<Appointment>[] = [
    { label: t('calendar.viewDetails'), onClick: (a) => setViewAppt(a) },
    { label: t('common.edit'),          onClick: (a) => { setEditAppt(a); setShowForm(true) } },
    { label: t('calendar.cancelAppointment'), onClick: (a) => handleStatusChange(a.id, 'cancelled'), hidden: (a) => a.status === 'cancelled' },
    { label: t('common.delete'),        onClick: (a) => removeAppointment(a.id), danger: true },
  ]

  const monthLabel = weekStart.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })

  return (
    <div>
      <PageHeader
        title={t('calendar.title')}
        subtitle={t('calendar.subtitle')}
        breadcrumb={[{ label: t('nav.dashboard'), href: '/' }, { label: t('nav.calendar') }]}
        actions={
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-[var(--color-surface-container-low)] rounded-[var(--radius-DEFAULT)] p-0.5">
              {(['week', 'day', 'list'] as ViewMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={cn(
                    'px-3 py-1.5 rounded text-xs font-semibold transition-colors',
                    viewMode === m
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'
                  )}
                >
                  {t(VIEW_MODE_KEYS[m])}
                </button>
              ))}
            </div>
            <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => { setEditAppt(undefined); setShowForm(true) }}>
              {t('calendar.newAppointment')}
            </Button>
          </div>
        }
      />

      {/* Stats row */}
      {loadError && (
        <div className="mb-4 px-4 py-3 rounded-[var(--radius-DEFAULT)] bg-[var(--color-error-container)] text-[var(--color-on-error-container)] text-sm font-medium">
          {t('calendar.loadFailed', { error: loadError })}
        </div>
      )}
      <PageStatsGrid
        className="calendar-stats-grid mb-6"
        stats={[
          {
            label: t('calendar.today'),
            value: stats?.today ?? getByDate(todayStr).length,
            icon: <CalendarDays size={18} />,
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-50 dark:bg-blue-950/30',
          },
          {
            label: t('calendar.thisWeek'),
            value: stats?.thisWeek ?? weekAppts.length,
            icon: <CalendarRange size={18} />,
            color: 'text-violet-600 dark:text-violet-400',
            bg: 'bg-violet-50 dark:bg-violet-950/30',
          },
          {
            label: t('calendar.confirmed'),
            value: stats?.confirmed ?? appointments.filter((a) => a.status === 'confirmed').length,
            icon: <CheckCircle2 size={18} />,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-50 dark:bg-emerald-950/30',
          },
          {
            label: t('status.pending'),
            value: stats?.pending ?? appointments.filter((a) => a.status === 'scheduled').length,
            icon: <Hourglass size={18} />,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-50 dark:bg-amber-950/30',
          },
        ]}
      />

      <AnimatePresence mode="wait">
        {/* ── WEEK VIEW ── */}
        {viewMode === 'week' && (
          <motion.div key="week" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SectionCard noPadding>
              {/* Week header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-outline-variant)]/20">
                <div className="flex items-center gap-2">
                  <button onClick={prevWeek} className="p-1.5 rounded hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] transition-colors"><ChevronLeft size={16} /></button>
                  <h3 className="font-semibold text-sm text-[var(--color-on-surface)]">{monthLabel}</h3>
                  <button onClick={nextWeek} className="p-1.5 rounded hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] transition-colors"><ChevronRight size={16} /></button>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedDate(todayStr)}>{t('calendar.today')}</Button>
              </div>

              {/* Day headers + cells — horizontally scrollable on small screens */}
              <div className="overflow-x-auto">
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-[var(--color-outline-variant)]/20 min-w-[480px]">
                {weekDays.map((d, i) => {
                  const ds = d.toISOString().split('T')[0]
                  const isToday = ds === todayStr
                  const isSelected = ds === selectedDate
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(ds)}
                      className={cn(
                        'py-3 text-center transition-colors',
                        isSelected ? 'bg-[var(--color-primary-container)]/20' : 'hover:bg-[var(--color-surface-container-high)]'
                      )}
                    >
                      <p className="text-[10px] font-semibold uppercase text-[var(--color-on-surface-variant)]">{weekdayLabels[d.getDay()]}</p>
                      <div className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center mx-auto mt-1 text-sm font-bold',
                        isToday ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-on-surface)]'
                      )}>
                        {d.getDate()}
                      </div>
                      {getByDate(ds).length > 0 && (
                        <div className="flex justify-center gap-0.5 mt-1">
                          {getByDate(ds).slice(0, 3).map((_, j) => (
                            <div key={j} className="w-1 h-1 rounded-full bg-[var(--color-primary)]" />
                          ))}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Calendar cells */}
              <div className="grid grid-cols-7 gap-px bg-[var(--color-outline-variant)]/10 p-2 min-w-[480px]">
                {weekDays.map((d, i) => {
                  const ds = d.toISOString().split('T')[0]
                  return (
                    <CalendarCell
                      key={i}
                      date={d}
                      appointments={getByDate(ds)}
                      isSelected={ds === selectedDate}
                      isToday={ds === todayStr}
                      onClick={(dt) => setSelectedDate(dt.toISOString().split('T')[0])}
                    />
                  )
                })}
              </div>
              </div> {/* end overflow-x-auto */}
            </SectionCard>

            {/* Day schedule below */}
            <div className="mt-6">
              <SectionCard noPadding>
                <ScheduleWidget
                  date={selectedDate}
                  appointments={todayAppts}
                  onDateChange={setSelectedDate}
                  onAppointmentClick={setViewAppt}
                  onSlotAddClick={handleSlotAdd}
                  onAddClick={() => { setEditAppt(undefined); setShowForm(true) }}
                />
              </SectionCard>
            </div>
          </motion.div>
        )}

        {/* ── DAY VIEW ── */}
        {viewMode === 'day' && (
          <motion.div key="day" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="calendar-day-grid grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 items-start">
              <div>
                <SectionCard noPadding>
                  <ScheduleWidget
                    date={selectedDate}
                    appointments={todayAppts}
                    onDateChange={setSelectedDate}
                    onAppointmentClick={setViewAppt}
                    onSlotAddClick={handleSlotAdd}
                    onAddClick={() => { setEditAppt(undefined); setShowForm(true) }}
                  />
                </SectionCard>
              </div>
              <div>
                <SectionCard title={t('calendar.todayAppts')} icon={<CalendarDays size={15} />}>
                  {todayAppts.length === 0 ? (
                    <p className="text-sm text-[var(--color-on-surface-variant)] text-center py-4">{t('calendar.noAppointments')}</p>
                  ) : (
                    <div className="space-y-3">
                      {todayAppts.map((a, i) => (
                        <AppointmentCard key={a.id} appointment={a} onClick={setViewAppt} compact delay={i * 0.05} />
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── LIST VIEW ── */}
        {viewMode === 'list' && (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SectionCard noPadding>
              {/* Custom toolbar with fixed SearchBar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', borderBottom: '1px solid rgba(189,201,201,0.2)' }}>
                <SearchBar
                  value={listSearch}
                  onChange={setListSearch}
                  placeholder={t('calendar.searchPlaceholder')}
                  maxWidth="26rem"
                />
              </div>
              <DataTable
                columns={columns}
                data={appointments}
                actions={actions}
                searchable={false}
                externalSearch={listSearch}
                pageSize={10}
                emptyTitle={t('calendar.noAppointmentsFound')}
                emptyIcon={<CalendarDays size={28} />}
                onRowClick={setViewAppt}
              />
            </SectionCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AppointmentViewModal
        appointment={viewAppt}
        open={!!viewAppt}
        onClose={() => setViewAppt(null)}
        onEdit={(a) => { setEditAppt(a); setShowForm(true) }}
        onDelete={(id) => { removeAppointment(id); setViewAppt(null) }}
        onStatusChange={handleStatusChange}
      />
      <AppointmentFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditAppt(undefined); setBookingError(null) }}
        onSave={handleSaveNew}
        initialDate={selectedDate}
        initialData={editAppt}
        loading={bookingLoading}
      />
      {bookingError && (
        <div style={{ position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: 'var(--color-error-container)', color: 'var(--color-on-error-container)', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-DEFAULT)', fontSize: '0.875rem', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', maxWidth: '28rem', textAlign: 'center' }}>
          {bookingError}
        </div>
      )}

    </div>
  )
}
