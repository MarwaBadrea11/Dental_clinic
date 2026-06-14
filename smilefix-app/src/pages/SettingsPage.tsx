import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sun, Moon, Globe, Shield, User, Bell,
  Building2, Palette, Lock, ChevronRight, Check, Clock, Eye, EyeOff,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { FormField } from '@/components/ui/FormField'
import { ImageUploadArea } from '@/components/ui/ImageUploadArea'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { useNotificationPreferencesStore } from '@/store/notificationPreferencesStore'
import { updateMyProfile } from '@/services/patientService'
import {
  updateMyAccount,
  uploadMyAvatar,
  removeMyAvatar,
  getSavedUser,
  authUserToProfile,
  changePassword,
} from '@/services/authService'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/utils/cn'
import {
  buildCurrencySelectOptions,
  buildDateFormatSelectOptions,
  buildLanguageSelectOptions,
  buildTimezoneSelectOptions,
  CLINIC_FIELD_KEYS,
  clinicFieldKey,
  clinicPlaceholderKey,
  getNotificationPrefLabel,
  getPermissionLabel,
  getPermissionRoleLabel,
  getSettingsTabLabel,
  getWeekdayLabels,
  NOTIFICATION_PREF_KEYS,
  PERMISSION_ROLES,
  SETTINGS_TAB_IDS,
  type SettingsTabId,
} from '@/i18n/settingsOptions'
import {
  fetchWorkingHours,
  saveWorkingHours,
  fetchClinicInfo,
  saveClinicInfo,
  generateSlots,
  type WorkingHoursDay,
  type ClinicInfo,
} from '@/services/settingsService'

const TAB_ICONS: Record<SettingsTabId, React.ReactNode> = {
  profile:       <User size={15} />,
  appearance:    <Palette size={15} />,
  clinic:        <Building2 size={15} />,
  workingHours:  <Clock size={15} />,
  notifications: <Bell size={15} />,
  permissions:   <Shield size={15} />,
  security:      <Lock size={15} />,
}

function parseSettingsTab(tab: string | null): SettingsTabId {
  if (tab && SETTINGS_TAB_IDS.includes(tab as SettingsTabId)) {
    return tab as SettingsTabId
  }
  return 'profile'
}

function isStrongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  )
}

function PasswordVisibilityToggle({
  visible,
  onToggle,
  showLabel,
  hideLabel,
}: {
  visible: boolean
  onToggle: () => void
  showLabel: string
  hideLabel: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="p-0.5 rounded text-[var(--color-outline)] hover:text-[var(--color-on-surface)] transition-colors"
      aria-label={visible ? hideLabel : showLabel}
    >
      {visible ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  )
}

function Toggle({
  checked, onChange, label, isRtl,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  isRtl: boolean
}) {
  const thumbX = checked ? (isRtl ? 2 : 20) : (isRtl ? 20 : 2)

  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer py-2">
      <span className="text-sm text-[var(--color-on-surface)]">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-10 h-5 shrink-0 rounded-full transition-colors duration-200',
          checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-outline-variant)]'
        )}
        role="switch"
        aria-checked={checked}
      >
        <motion.div
          animate={{ x: thumbX }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"
        />
      </button>
    </label>
  )
}

export default function SettingsPage() {
  const { theme, toggleTheme, language, setLanguage } = useUIStore()
  const { user, syncFromAuthUser, forceLogout } = useAuthStore()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const isRtl = language === 'ar'
  const [activeTab, setActiveTab] = useState<SettingsTabId>(() => parseSettingsTab(searchParams.get('tab')))
  const [saved, setSaved]         = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError]   = useState<string | null>(null)

  const {
    preferences: notifs,
    isLoading: notifsLoading,
    isSaving: notifsSaving,
    error: notifsError,
    load: loadPrefs,
    toggle: togglePref,
    save: savePrefs,
  } = useNotificationPreferencesStore()

  useEffect(() => {
    if (activeTab === 'notifications') loadPrefs()
  }, [activeTab, loadPrefs])

  useEffect(() => {
    setActiveTab(parseSettingsTab(searchParams.get('tab')))
  }, [searchParams])

  const [profileForm, setProfileForm] = useState({
    name:      user?.name      ?? '',
    email:     user?.email     ?? '',
    specialty: user?.specialty ?? '',
    phone:     user?.phone     ?? '',
    bio:       user?.bio       ?? '',
  })

  useEffect(() => {
    if (!user) return
    setProfileForm({
      name:      user.name      ?? '',
      email:     user.email     ?? '',
      specialty: user.specialty ?? '',
      phone:     user.phone     ?? '',
      bio:       user.bio       ?? '',
    })
  }, [user])

  const [avatarFile, setAvatarFile]       = useState<File | null>(null)
  const [avatarRemoved, setAvatarRemoved] = useState(false)
  const avatarPreview = avatarFile
    ? undefined
    : avatarRemoved
      ? undefined
      : user?.avatar

  const [clinicForm, setClinicForm] = useState<ClinicInfo>({
    name:     '',
    address:  '',
    city:     '',
    phone:    '',
    email:    '',
    website:  '',
    taxId:    '',
  })

  const [clinicLoading, setClinicLoading] = useState(false)
  const [clinicSaving,  setClinicSaving]  = useState(false)
  const [clinicError,   setClinicError]   = useState<string | null>(null)

  const [localeForm, setLocaleForm] = useState({ timezone: 'UTC-8', currency: 'USD' })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword:     '',
    confirmPassword: '',
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword]         = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError]   = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  // ── Working-hours state ──────────────────────────────────────────────────
  const [workingHours, setWorkingHours] = useState<WorkingHoursDay[]>([])
  const [whLoading, setWhLoading]       = useState(false)
  const [whSaving,  setWhSaving]        = useState(false)
  const [whError,   setWhError]         = useState<string | null>(null)

  useEffect(() => {
    if (activeTab !== 'workingHours') return
    if (workingHours.length > 0) return   // already loaded
    setWhLoading(true)
    setWhError(null)
    fetchWorkingHours()
      .then(setWorkingHours)
      .catch(() => setWhError(t('common.loadFailed') || 'Failed to load working hours'))
      .finally(() => setWhLoading(false))
  }, [activeTab])

  useEffect(() => {
    if (activeTab !== 'clinic') return
    setClinicLoading(true)
    setClinicError(null)
    fetchClinicInfo()
      .then(setClinicForm)
      .catch(() => setClinicError(t('common.loadFailed') || 'Failed to load clinic information'))
      .finally(() => setClinicLoading(false))
  }, [activeTab, t])

  const updateDay = (dow: number, patch: Partial<WorkingHoursDay>) => {
    setWorkingHours((prev) =>
      prev.map((d) => (d.dayOfWeek === dow ? { ...d, ...patch } : d)),
    )
  }

  const handleSaveWorkingHours = async () => {
    setWhSaving(true)
    setWhError(null)
    try {
      const saved = await saveWorkingHours(workingHours)
      setWorkingHours(saved)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save working hours'
      setWhError(msg)
    } finally {
      setWhSaving(false)
    }
  }

  const handleSaveClinicInfo = async () => {
    setClinicSaving(true)
    setClinicError(null)
    try {
      const saved = await saveClinicInfo(clinicForm)
      setClinicForm(saved)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setClinicError(err instanceof Error ? err.message : t('common.saveFailed'))
    } finally {
      setClinicSaving(false)
    }
  }

  const handleChangePassword = async () => {
    setPasswordError(null)
    setPasswordSuccess(false)

    const { currentPassword, newPassword, confirmPassword } = passwordForm

    if (!currentPassword.trim()) {
      setPasswordError(t('settings.currentPasswordRequired', { defaultValue: 'Current password is required' }))
      return
    }
    if (!isStrongPassword(newPassword)) {
      setPasswordError(t('settings.passwordRequirements', {
        defaultValue: 'Password must be at least 8 characters and include uppercase, number, and special character',
      }))
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('settings.passwordMismatch', { defaultValue: 'New passwords do not match' }))
      return
    }
    if (currentPassword === newPassword) {
      setPasswordError(t('settings.passwordSameAsCurrent', { defaultValue: 'New password must be different from current password' }))
      return
    }

    setPasswordSaving(true)
    try {
      await changePassword({ currentPassword, newPassword })
      setPasswordSuccess(true)
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setShowCurrentPassword(false)
      setShowNewPassword(false)
      setShowConfirmPassword(false)
      forceLogout()
      setTimeout(() => {
        navigate(ROUTES.LOGIN, {
          replace: true,
          state: { message: t('settings.passwordUpdated', { defaultValue: 'Password updated. Please sign in again.' }) },
        })
      }, 1200)
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : t('common.saveFailed'))
    } finally {
      setPasswordSaving(false)
    }
  }

  /** Save handler — profile tab calls the backend; others just show the saved indicator */
  const handleSave = async () => {
    if (activeTab === 'notifications') {
      await savePrefs()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      return
    }

    if (activeTab === 'workingHours') {
      await handleSaveWorkingHours()
      return
    }

    if (activeTab === 'clinic') {
      await handleSaveClinicInfo()
      return
    }

    if (activeTab === 'profile') {
      setProfileSaving(true)
      setProfileError(null)
      try {
        let authUser = null

        if (avatarFile) {
          authUser = await uploadMyAvatar(avatarFile)
        } else if (avatarRemoved && user?.avatar) {
          authUser = await removeMyAvatar()
        }

        const isPatient = getSavedUser()?.role?.toUpperCase() === 'PATIENT'

        const profilePayload = {
          username: profileForm.name.trim() || undefined,
          email:    profileForm.email.trim() || undefined,
          phone:    profileForm.phone.trim() || null,
          specialty: profileForm.specialty.trim() || null,
          bio:      profileForm.bio.trim() || null,
        }

        if (isPatient) {
          const [firstName, ...rest] = profileForm.name.trim().split(' ')
          await updateMyProfile({
            first_name: firstName || profileForm.name,
            last_name:  rest.join(' ') || undefined,
            email:      profileForm.email || undefined,
            phone:      profileForm.phone || undefined,
          })
        }

        authUser = await updateMyAccount(profilePayload)

        if (authUser) {
          syncFromAuthUser(authUser)
          setProfileForm(authUserToProfile(authUser))
        }
        setAvatarFile(null)
        setAvatarRemoved(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } catch (err) {
        setProfileError(err instanceof Error ? err.message : t('common.saveFailed'))
      } finally {
        setProfileSaving(false)
      }
      return
    }

    // Other tabs: local state only
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const languageOptions = buildLanguageSelectOptions(t)
  const timezoneOptions = buildTimezoneSelectOptions(t)
  const dateFormatOptions = buildDateFormatSelectOptions(t)
  const currencyOptions = buildCurrencySelectOptions(t)

  const sessionRows = [
    {
      device: t('settings.sessions.chromeWindows'),
      location: t('settings.sessions.losAngeles'),
      time: t('settings.currentSession'),
      current: true,
    },
    {
      device: t('settings.sessions.safariIphone'),
      location: t('settings.sessions.losAngeles'),
      time: t('settings.sessions.hoursAgo', { count: 2 }),
      current: false,
    },
  ]

  const panelMotion = isRtl ? { initial: { opacity: 0, x: -8 }, exit: { opacity: 0, x: 8 } } : { initial: { opacity: 0, x: 8 }, exit: { opacity: 0, x: -8 } }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'}>
      <PageHeader
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
        breadcrumb={[{ label: t('nav.dashboard'), href: '/' }, { label: t('nav.settings') }]}
        actions={
          <Button
            size="sm"
            onClick={handleSave}
            disabled={notifsSaving || profileSaving || whSaving || clinicSaving}
            className={saved ? 'bg-[var(--color-secondary)]' : ''}
          >
            {(notifsSaving || profileSaving || whSaving || clinicSaving)
              ? t('settings.saving')
              : saved
              ? `✓ ${t('common.saved')}`
              : t('common.save')}
          </Button>
        }
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-3">
          <SectionCard delay={0}>
            <nav className="space-y-0.5">
              {SETTINGS_TAB_IDS.map((tabId) => (
                <button
                  key={tabId}
                  onClick={() => setActiveTab(tabId)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-DEFAULT)] text-sm font-medium transition-all duration-200',
                    activeTab === tabId
                      ? 'bg-[var(--color-primary-container)]/20 text-[var(--color-primary)]'
                      : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)] hover:text-[var(--color-on-surface)]',
                  )}
                >
                  <span className={activeTab === tabId ? 'text-[var(--color-primary)]' : 'text-[var(--color-outline)]'}>
                    {TAB_ICONS[tabId]}
                  </span>
                  {getSettingsTabLabel(t, tabId)}
                  {activeTab === tabId && (
                    <ChevronRight size={14} className={cn('ms-auto', isRtl && 'rotate-180')} />
                  )}
                </button>
              ))}
            </nav>
          </SectionCard>
        </div>

        <div className="col-span-12 lg:col-span-9">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={panelMotion.initial}
              animate={{ opacity: 1, x: 0 }}
              exit={panelMotion.exit}
              transition={{ duration: 0.2 }}
            >

              {activeTab === 'profile' && (
                <SectionCard title={t('settings.profileSettings')} icon={<User size={15} />}>
                  {profileError && (
                    <div className="mb-4 px-4 py-2.5 rounded-[var(--radius-DEFAULT)] bg-[var(--color-error-container)] text-[var(--color-error)] text-sm">
                      {profileError}
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-6 mb-6">
                    <ImageUploadArea
                      name={profileForm.name}
                      size="lg"
                      label={t('settings.profilePhoto')}
                      className="shrink-0"
                      value={avatarPreview}
                      onChange={(file) => {
                        if (file) {
                          setAvatarFile(file)
                          setAvatarRemoved(false)
                        } else {
                          setAvatarFile(null)
                          setAvatarRemoved(!!user?.avatar)
                        }
                      }}
                    />
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField label={t('settings.fullName')}>
                        <Input value={profileForm.name} onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))} />
                      </FormField>
                      <FormField label={t('settings.email')}>
                        <Input type="email" value={profileForm.email} onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))} />
                      </FormField>
                      <FormField label={t('settings.specialty')}>
                        <Input value={profileForm.specialty} onChange={(e) => setProfileForm((f) => ({ ...f, specialty: e.target.value }))} />
                      </FormField>
                      <FormField label={t('settings.phone')}>
                        <Input value={profileForm.phone} onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))} />
                      </FormField>
                      <FormField label={t('settings.bio')} className="col-span-2">
                        <Input value={profileForm.bio} onChange={(e) => setProfileForm((f) => ({ ...f, bio: e.target.value }))} />
                      </FormField>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm" loading={profileSaving} onClick={handleSave}>{t('settings.updateProfile')}</Button>
                  </div>
                </SectionCard>
              )}

              {activeTab === 'appearance' && (
                <div className="space-y-5">
                  <SectionCard title={t('settings.theme')} icon={<Palette size={15} />}>
                    <div className="flex items-center gap-4">
                      {(['light', 'dark'] as const).map((themeOpt) => (
                        <button
                          key={themeOpt}
                          type="button"
                          onClick={() => { if (theme !== themeOpt) toggleTheme() }}
                          className={cn(
                            'flex-1 flex flex-col items-center gap-3 p-4 rounded-[var(--radius-lg)] border-2 transition-all duration-200',
                            theme === themeOpt
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary-container)]/10'
                              : 'border-[var(--color-outline-variant)]/30 hover:border-[var(--color-outline)]',
                          )}
                        >
                          <div className={cn(
                            'w-12 h-12 rounded-full flex items-center justify-center',
                            themeOpt === 'light'
                              ? 'bg-amber-100 text-amber-600'
                              : 'bg-[var(--color-inverse-surface)] text-[var(--color-inverse-on-surface)]',
                          )}>
                            {themeOpt === 'light' ? <Sun size={22} /> : <Moon size={22} />}
                          </div>
                          <span className="text-sm font-semibold text-[var(--color-on-surface)]">
                            {themeOpt === 'light' ? t('settings.lightMode') : t('settings.darkMode')}
                          </span>
                          {theme === themeOpt && (
                            <span className="flex items-center gap-1 text-[11px] text-[var(--color-primary)] font-semibold">
                              <Check size={11} /> {t('settings.active')}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </SectionCard>

                  <SectionCard title={t('settings.languageRegion')} icon={<Globe size={15} />}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField label={t('settings.language')}>
                        <Select
                          options={languageOptions}
                          value={language}
                          onChange={(e) => setLanguage(e.target.value as 'en' | 'ar')}
                        />
                      </FormField>
                      <FormField label={t('settings.timezone')}>
                        <Select options={timezoneOptions} value={localeForm.timezone} onChange={() => {}} />
                      </FormField>
                      <FormField label={t('settings.dateFormat')}>
                        <Select options={dateFormatOptions} value="mdy" onChange={() => {}} />
                      </FormField>
                      <FormField label={t('settings.currency')}>
                        <Select options={currencyOptions} value={localeForm.currency} onChange={() => {}} />
                      </FormField>
                    </div>
                  </SectionCard>
                </div>
              )}

              {activeTab === 'clinic' && (
                <SectionCard title={t('settings.clinicInformation')} icon={<Building2 size={15} />}>
                  {clinicError && (
                    <div className="mb-4 px-4 py-2.5 rounded-[var(--radius-DEFAULT)] bg-[var(--color-error-container)] text-[var(--color-error)] text-sm">
                      {clinicError}
                    </div>
                  )}
                  {clinicLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {CLINIC_FIELD_KEYS.map((key) => (
                        <div key={key} className="h-10 rounded-[var(--radius-DEFAULT)] bg-[var(--color-surface-container-high)] animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {CLINIC_FIELD_KEYS.map((key) => (
                        <FormField key={key} label={t(clinicFieldKey[key])}>
                          <Input
                            placeholder={t(clinicPlaceholderKey[key])}
                            value={clinicForm[key]}
                            onChange={(e) => setClinicForm((prev) => ({ ...prev, [key]: e.target.value }))}
                          />
                        </FormField>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-end mt-4">
                    <Button
                      size="sm"
                      loading={clinicSaving}
                      onClick={handleSaveClinicInfo}
                      disabled={clinicLoading || clinicSaving}
                    >
                      {t('settings.saveClinicInfo')}
                    </Button>
                  </div>
                </SectionCard>
              )}

              {activeTab === 'workingHours' && (
                <SectionCard
                  title={t('settings.workingHours')}
                  icon={<Clock size={15} />}
                  subtitle={t('settings.workingHoursSubtitle')}
                >
                  {/* Error banner */}
                  {whError && (
                    <div className="mb-4 px-4 py-2.5 rounded-[var(--radius-DEFAULT)] bg-[var(--color-error-container)] text-[var(--color-error)] text-sm">
                      {whError}
                    </div>
                  )}

                  {/* Loading skeleton */}
                  {whLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 7 }).map((_, i) => (
                        <div key={i} className="h-16 rounded-[var(--radius-DEFAULT)] bg-[var(--color-surface-container-high)] animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {workingHours.map((day) => {
                        const dayLabel = getWeekdayLabels(language)[day.dayOfWeek]
                        const morningSlots = generateSlots(day.morningStart, day.morningEnd)
                        const eveningSlots = generateSlots(day.eveningStart, day.eveningEnd)

                        return (
                          <div
                            key={day.dayOfWeek}
                            className={cn(
                              'rounded-[var(--radius-lg)] border p-4 transition-colors',
                              day.isOpen
                                ? 'border-[var(--color-primary)]/20 bg-[var(--color-primary-container)]/5'
                                : 'border-[var(--color-outline-variant)]/20 bg-[var(--color-surface-container-low)]',
                            )}
                          >
                            {/* Day header row */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-sm text-[var(--color-on-surface)] w-28">
                                  {dayLabel}
                                </span>
                                <span className={cn(
                                  'text-xs font-semibold px-2 py-0.5 rounded-full',
                                  day.isOpen
                                    ? 'bg-[var(--color-secondary-container)]/30 text-[var(--color-secondary)]'
                                    : 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]',
                                )}>
                                  {day.isOpen ? t('settings.open') : t('settings.closed')}
                                </span>
                              </div>
                              {/* Open / closed toggle */}
                              <button
                                type="button"
                                onClick={() => updateDay(day.dayOfWeek, { isOpen: !day.isOpen })}
                                className={cn(
                                  'relative w-10 h-5 shrink-0 rounded-full transition-colors duration-200',
                                  day.isOpen ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-outline-variant)]',
                                )}
                                role="switch"
                                aria-checked={day.isOpen}
                                aria-label={`Toggle ${dayLabel}`}
                              >
                                <motion.div
                                  animate={{ x: day.isOpen ? (isRtl ? 2 : 20) : (isRtl ? 20 : 2) }}
                                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                  className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"
                                />
                              </button>
                            </div>

                            {/* Shift time pickers — only when day is open */}
                            {day.isOpen && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                                {/* Morning shift */}
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold text-[var(--color-primary)] uppercase tracking-wide flex items-center gap-1.5">
                                    <Sun size={12} /> {t('settings.morningShift')}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <FormField label={t('settings.startTime')} className="flex-1 mb-0">
                                      <Input
                                        type="time"
                                        value={day.morningStart ?? ''}
                                        onChange={(e) => updateDay(day.dayOfWeek, { morningStart: e.target.value || null })}
                                      />
                                    </FormField>
                                    <span className="text-[var(--color-on-surface-variant)] mt-5">–</span>
                                    <FormField label={t('settings.endTime')} className="flex-1 mb-0">
                                      <Input
                                        type="time"
                                        value={day.morningEnd ?? ''}
                                        onChange={(e) => updateDay(day.dayOfWeek, { morningEnd: e.target.value || null })}
                                      />
                                    </FormField>
                                  </div>
                                  {/* Slot preview */}
                                  {morningSlots.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {morningSlots.map((s) => (
                                        <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-primary-container)]/20 text-[var(--color-primary)] font-mono">
                                          {s}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Evening shift */}
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold text-[var(--color-tertiary)] uppercase tracking-wide flex items-center gap-1.5">
                                    <Moon size={12} /> {t('settings.eveningShift')}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <FormField label={t('settings.startTime')} className="flex-1 mb-0">
                                      <Input
                                        type="time"
                                        value={day.eveningStart ?? ''}
                                        onChange={(e) => updateDay(day.dayOfWeek, { eveningStart: e.target.value || null })}
                                      />
                                    </FormField>
                                    <span className="text-[var(--color-on-surface-variant)] mt-5">–</span>
                                    <FormField label={t('settings.endTime')} className="flex-1 mb-0">
                                      <Input
                                        type="time"
                                        value={day.eveningEnd ?? ''}
                                        onChange={(e) => updateDay(day.dayOfWeek, { eveningEnd: e.target.value || null })}
                                      />
                                    </FormField>
                                  </div>
                                  {/* Slot preview */}
                                  {eveningSlots.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {eveningSlots.map((s) => (
                                        <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-tertiary-container)]/20 text-[var(--color-tertiary)] font-mono">
                                          {s}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <div className="flex justify-end items-center gap-3 mt-5">
                    {/* Success indicator */}
                    {saved && (
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-secondary)]">
                        <Check size={15} />
                        {t('common.saved') || 'Saved!'}
                      </span>
                    )}
                    <Button
                      size="sm"
                      loading={whSaving}
                      onClick={handleSaveWorkingHours}
                      disabled={whLoading || whSaving}
                    >
                      {t('settings.saveWorkingHours')}
                    </Button>
                  </div>
                </SectionCard>
              )}

              {activeTab === 'notifications' && (
                <SectionCard title={t('settings.notificationPreferences')} icon={<Bell size={15} />}>
                  {notifsError && (
                    <div className="mb-4 px-4 py-2.5 rounded-[var(--radius-DEFAULT)] bg-[var(--color-error-container)] text-[var(--color-error)] text-sm">
                      {notifsError}
                    </div>
                  )}
                  <div className={cn('divide-y divide-[var(--color-outline-variant)]/15', notifsLoading && 'opacity-50 pointer-events-none')}>
                    {NOTIFICATION_PREF_KEYS.map((key) => (
                      <Toggle
                        key={key}
                        checked={notifs[key]}
                        onChange={(v) => togglePref(key, v)}
                        label={getNotificationPrefLabel(t, key)}
                        isRtl={isRtl}
                      />
                    ))}
                  </div>
                  {notifsLoading && (
                    <p className="mt-3 text-xs text-[var(--color-on-surface-variant)]">{t('settings.loadingPreferences')}</p>
                  )}
                </SectionCard>
              )}

              {activeTab === 'permissions' && (
                <SectionCard title={t('settings.rolePermissions')} icon={<Shield size={15} />} subtitle={t('settings.configureAccess')}>
                  <div className="space-y-5">
                    {PERMISSION_ROLES.map((rp) => (
                      <div key={rp.roleKey} className="bg-[var(--color-surface-container-low)] rounded-[var(--radius-md)] p-4">
                        <p className="font-semibold text-sm text-[var(--color-on-surface)] mb-3">{getPermissionRoleLabel(t, rp.roleKey)}</p>
                        <div className="flex flex-wrap gap-2">
                          {rp.permissions.map((p) => (
                            <span key={p} className="flex items-center gap-1 px-2.5 py-1 bg-[var(--color-primary-container)]/20 text-[var(--color-primary)] text-xs font-semibold rounded-full">
                              <Check size={10} /> {getPermissionLabel(t, p)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-[var(--color-on-surface-variant)]">
                      {t('settings.permissionNote')}
                    </p>
                  </div>
                </SectionCard>
              )}

              {activeTab === 'security' && (
                <div className="space-y-5">
                  <SectionCard title={t('settings.changePassword')} icon={<Lock size={15} />}>
                    {passwordError && (
                      <div className="mb-4 px-4 py-2.5 rounded-[var(--radius-DEFAULT)] bg-[var(--color-error-container)] text-[var(--color-error)] text-sm">
                        {passwordError}
                      </div>
                    )}
                    {passwordSuccess && (
                      <div className="mb-4 px-4 py-2.5 rounded-[var(--radius-DEFAULT)] bg-[var(--color-secondary-container)] text-[var(--color-secondary)] text-sm flex items-center gap-2">
                        <Check size={15} />
                        {t('settings.passwordUpdated', { defaultValue: 'Password updated. Please sign in again.' })}
                      </div>
                    )}
                    <div className="grid w-full grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5">
                      <FormField label={t('settings.currentPassword')}>
                        <Input
                          type={showCurrentPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          placeholder={t('settings.passwordPlaceholder')}
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))}
                          trailingAction={
                            <PasswordVisibilityToggle
                              visible={showCurrentPassword}
                              onToggle={() => setShowCurrentPassword((v) => !v)}
                              showLabel={t('auth.showPassword')}
                              hideLabel={t('auth.hidePassword')}
                            />
                          }
                        />
                      </FormField>
                      <FormField label={t('settings.newPassword')}>
                        <Input
                          type={showNewPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          placeholder={t('settings.passwordPlaceholder')}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
                          trailingAction={
                            <PasswordVisibilityToggle
                              visible={showNewPassword}
                              onToggle={() => setShowNewPassword((v) => !v)}
                              showLabel={t('auth.showPassword')}
                              hideLabel={t('auth.hidePassword')}
                            />
                          }
                        />
                      </FormField>
                      <FormField label={t('settings.confirmPassword')} className="sm:col-span-2">
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          placeholder={t('settings.passwordPlaceholder')}
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                          trailingAction={
                            <PasswordVisibilityToggle
                              visible={showConfirmPassword}
                              onToggle={() => setShowConfirmPassword((v) => !v)}
                              showLabel={t('auth.showPassword')}
                              hideLabel={t('auth.hidePassword')}
                            />
                          }
                        />
                      </FormField>
                    </div>
                    <div className="flex justify-end mt-4">
                      <Button
                        size="sm"
                        loading={passwordSaving}
                        disabled={passwordSaving || passwordSuccess}
                        onClick={handleChangePassword}
                      >
                        {t('settings.updatePassword')}
                      </Button>
                    </div>
                  </SectionCard>

                  <SectionCard title={t('settings.securitySettings')} icon={<Shield size={15} />}>
                    <div className="divide-y divide-[var(--color-outline-variant)]/15">
                      <Toggle checked={true}  onChange={() => {}} label={t('settings.twoFactor')} isRtl={isRtl} />
                      <Toggle checked={true}  onChange={() => {}} label={t('settings.loginNotifications')} isRtl={isRtl} />
                      <Toggle checked={false} onChange={() => {}} label={t('settings.rememberDevices')} isRtl={isRtl} />
                      <Toggle checked={true}  onChange={() => {}} label={t('settings.sessionTimeout')} isRtl={isRtl} />
                    </div>
                  </SectionCard>

                  <SectionCard title={t('settings.activeSessions')} icon={<Lock size={15} />}>
                    {sessionRows.map((s, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 py-3 border-b border-[var(--color-outline-variant)]/10 last:border-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[var(--color-on-surface)]">
                            {s.device}
                          </p>
                          <p className="text-xs text-[var(--color-on-surface-variant)]">
                            {s.location} · {s.time}
                          </p>
                        </div>
                        {s.current
                          ? <span className="text-xs text-[var(--color-secondary)] font-semibold shrink-0">{t('settings.active')}</span>
                          : <Button variant="danger" size="xs">{t('settings.revoke')}</Button>
                        }
                      </div>
                    ))}
                  </SectionCard>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
