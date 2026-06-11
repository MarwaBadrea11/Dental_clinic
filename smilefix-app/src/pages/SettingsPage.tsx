import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sun, Moon, Globe, Shield, User, Bell,
  Building2, Palette, Lock, ChevronRight, Check,
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
  NOTIFICATION_PREF_KEYS,
  PERMISSION_ROLES,
  SETTINGS_TAB_IDS,
  type SettingsTabId,
} from '@/i18n/settingsOptions'

const TAB_ICONS: Record<SettingsTabId, React.ReactNode> = {
  profile:       <User size={15} />,
  appearance:    <Palette size={15} />,
  clinic:        <Building2 size={15} />,
  notifications: <Bell size={15} />,
  permissions:   <Shield size={15} />,
  security:      <Lock size={15} />,
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
  const { user } = useAuthStore()
  const { t } = useTranslation()
  const isRtl = language === 'ar'
  const [activeTab, setActiveTab] = useState<SettingsTabId>('profile')
  const [saved, setSaved]         = useState(false)

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

  const [profileForm, setProfileForm] = useState({
    name:      user?.name      ?? 'Dr. Smith',
    email:     user?.email     ?? 'dr.smith@smilefix.com',
    specialty: user?.specialty ?? 'Orthodontist',
    phone:     '+1 (555) 100-0001',
    bio:       'Board-certified orthodontist with 12 years of clinical experience.',
  })

  const [clinicForm, setClinicForm] = useState({
    name:     'SmileFix Dental Clinic',
    address:  '500 Medical Center Drive',
    city:     'Los Angeles, CA 90001',
    phone:    '+1 (800) SMILEFIX',
    email:    'info@smilefix.com',
    website:  'www.smilefix.com',
    taxId:    'TAX-88421',
    currency: 'USD',
    timezone: 'UTC-8',
  })

  const handleSave = async () => {
    if (activeTab === 'notifications') await savePrefs()
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
            disabled={notifsSaving}
            className={saved ? 'bg-[var(--color-secondary)]' : ''}
          >
            {notifsSaving
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
                  <div className="flex flex-col sm:flex-row gap-6 mb-6">
                    <ImageUploadArea name={profileForm.name} size="lg" label={t('settings.profilePhoto')} className="shrink-0" />
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
                    <Button size="sm" onClick={handleSave}>{t('settings.updateProfile')}</Button>
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
                        <Select options={timezoneOptions} value={clinicForm.timezone} onChange={() => {}} />
                      </FormField>
                      <FormField label={t('settings.dateFormat')}>
                        <Select options={dateFormatOptions} value="mdy" onChange={() => {}} />
                      </FormField>
                      <FormField label={t('settings.currency')}>
                        <Select options={currencyOptions} value={clinicForm.currency} onChange={() => {}} />
                      </FormField>
                    </div>
                  </SectionCard>
                </div>
              )}

              {activeTab === 'clinic' && (
                <SectionCard title={t('settings.clinicInformation')} icon={<Building2 size={15} />}>
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
                  <div className="flex justify-end mt-4">
                    <Button size="sm" onClick={handleSave}>{t('settings.saveClinicInfo')}</Button>
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
                    <div className="grid w-full grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5">
                      <FormField label={t('settings.currentPassword')}>
                        <Input type="password" placeholder={t('settings.passwordPlaceholder')} />
                      </FormField>
                      <FormField label={t('settings.newPassword')}>
                        <Input type="password" placeholder={t('settings.passwordPlaceholder')} />
                      </FormField>
                      <FormField label={t('settings.confirmPassword')} className="sm:col-span-2">
                        <Input type="password" placeholder={t('settings.passwordPlaceholder')} />
                      </FormField>
                    </div>
                    <div className="flex justify-end mt-4">
                      <Button size="sm">{t('settings.updatePassword')}</Button>
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
