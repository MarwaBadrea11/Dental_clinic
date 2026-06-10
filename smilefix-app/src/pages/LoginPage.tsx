import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Mail, Lock, Eye, EyeOff, User as UserIcon, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SmilefixLogo } from '@/components/ui/SmilefixLogo'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { ROUTES } from '@/constants/routes'
import { login as apiLogin, register as apiRegister } from '@/services/authService'
import type { User } from '@/types'

const FEATURES = [
  { icon: '🦷', labelKey: 'auth.patientRecords' },
  { icon: '📅', labelKey: 'auth.smartScheduling' },
  { icon: '💳', labelKey: 'auth.billingFinance' },
  { icon: '📊', labelKey: 'auth.clinicalAnalytics' },
]

// ── Shared input style ────────────────────────────────────────────────────────
function inputBaseStyle(isRTL: boolean): React.CSSProperties {
  return {
    width: '100%',
    height: '3rem',
    paddingLeft: isRTL ? '1rem' : '2.5rem',
    paddingRight: isRTL ? '2.5rem' : '1rem',
    fontSize: '0.9375rem',
    background: 'var(--color-surface-container-low)',
    border: '1.5px solid var(--color-outline-variant)',
    borderRadius: 'var(--radius-DEFAULT)',
    color: 'var(--color-on-surface)',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
    direction: isRTL ? 'rtl' : 'ltr',
    textAlign: isRTL ? 'right' : 'left',
  }
}

function inputPasswordStyle(isRTL: boolean): React.CSSProperties {
  return {
    ...inputBaseStyle(isRTL),
    paddingLeft: isRTL ? '3rem' : '2.5rem',
    paddingRight: isRTL ? '2.5rem' : '3rem',
  }
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--color-on-surface-variant)',
}

function onFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = '#61bec5'
  e.target.style.boxShadow = '0 0 0 3px rgba(97,190,197,0.18)'
}
function onBlur(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = 'var(--color-outline-variant)'
  e.target.style.boxShadow = 'none'
}
function onBlurError(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = 'var(--color-error)'
  e.target.style.boxShadow = 'none'
}

// ── Left branding panel ───────────────────────────────────────────────────────
function LeftPanel({ t }: { t: (k: string) => string }) {
  return (
    <div
      className="login-left-panel"
      style={{ width: '52%', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)' }} />
      <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', filter: 'blur(48px)' }} />
      <div style={{ position: 'absolute', bottom: -60, left: -60, width: 256, height: 256, borderRadius: '50%', background: 'rgba(149,241,248,0.12)', filter: 'blur(40px)' }} />
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 384, height: 384, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', filter: 'blur(60px)' }} />
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', padding: '3rem' }}>
        <SmilefixLogo size="md" light />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{ marginTop: 'auto', marginBottom: 'auto' }}
        >
          <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: '2.25rem', fontWeight: 800, color: 'white', lineHeight: 1.2, marginBottom: '1rem', maxWidth: '28rem' }}>
            {t('auth.clinicalPrecision')}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '1.0625rem', lineHeight: 1.7, maxWidth: '26rem' }}>
            {t('auth.clinicalDesc')}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '2rem' }}>
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.labelKey}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.3 + i * 0.08 }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', padding: '0.5rem 1rem', borderRadius: 9999, color: 'white', fontSize: '0.875rem', fontWeight: 500, whiteSpace: 'nowrap' }}
              >
                <span>{f.icon}</span>{t(f.labelKey)}
              </motion.div>
            ))}
          </div>
        </motion.div>
        <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.75rem' }}>© 2024 SmileFix. {t('auth.trustedBy')}</p>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { setUser } = useAuthStore()
  const { language } = useUIStore()
  const isRTL = language === 'ar'
  const location = useLocation()
  const from = (location.state as { from?: Location })?.from?.pathname ?? ROUTES.DASHBOARD

  const [isRegistering, setIsRegistering] = useState(false)

  // ── Login state ──────────────────────────────────────────────────────────────
  const [loading, setLoading]           = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail]               = useState('dr.smith@smilefix.com')
  const [password, setPassword]         = useState('password')
  const [loginError, setLoginError]     = useState('')

  // ── Register state ───────────────────────────────────────────────────────────
  const [regLoading, setRegLoading]           = useState(false)
  const [regDone, setRegDone]                 = useState(false)
  const [firstName, setFirstName]             = useState('')
  const [lastName, setLastName]               = useState('')
  const [regEmail, setRegEmail]               = useState('')
  const [regPassword, setRegPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showRegPass, setShowRegPass]         = useState(false)
  const [showConfirm, setShowConfirm]         = useState(false)
  const [regErrors, setRegErrors]             = useState<Record<string, string>>({})

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    if (!email || !password) {
      setLoginError(t('auth.emailAddress') + ' / ' + t('auth.password'))
      return
    }
    setLoading(true)
    try {
      const result = await apiLogin({ email: email.trim(), password })
      const displayName = result.user.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
      setUser({
        id:    result.user.id,
        name:  displayName,
        email: result.user.email,
        role:  result.user.role.toLowerCase() as User['role'],
      })
      navigate(from, { replace: true })
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const validateReg = () => {
    const errs: Record<string, string> = {}
    if (!firstName.trim())  errs.firstName = t('common.required')
    if (!lastName.trim())   errs.lastName  = t('common.required')
    if (!regEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail))
      errs.regEmail = t('auth.emailAddress')
    if (regPassword.length < 8)
      errs.regPassword = t('auth.minChars')
    if (!/[A-Z]/.test(regPassword))
      errs.regPassword = t('auth.minChars')
    if (!/[0-9]/.test(regPassword))
      errs.regPassword = t('auth.minChars')
    if (!/[^A-Za-z0-9]/.test(regPassword))
      errs.regPassword = t('auth.minChars')
    if (regPassword !== confirmPassword)
      errs.confirmPassword = t('auth.confirmPassword')
    setRegErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateReg()) return
    setRegLoading(true)
    try {
      await apiRegister({
        username: `${firstName.trim()} ${lastName.trim()}`,
        email:    regEmail.trim(),
        password: regPassword,
        role:     'RECEPTIONIST',
      })
      setRegLoading(false)
      setRegDone(true)
    } catch (err: unknown) {
      setRegErrors({ confirmPassword: err instanceof Error ? err.message : 'Registration failed. Please try again.' })
      setRegLoading(false)
    }
  }

  const switchToLogin = () => {
    setIsRegistering(false)
    setRegDone(false)
    setRegErrors({})
    setFirstName(''); setLastName(''); setRegEmail(''); setRegPassword(''); setConfirmPassword('')
  }

  // ── Icon position helper (flips for RTL) ─────────────────────────────────────
  const iconPos = (side: 'start' | 'end'): React.CSSProperties => {
    const isStart = side === 'start'
    const prop = isRTL ? (isStart ? 'right' : 'left') : (isStart ? 'left' : 'right')
    return { position: 'absolute', [prop]: '0.875rem', color: 'var(--color-outline)', display: 'flex', pointerEvents: 'none' }
  }
  const togglePos: React.CSSProperties = {
    position: 'absolute',
    [isRTL ? 'left' : 'right']: '0.875rem',
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--color-outline)', display: 'flex', alignItems: 'center', padding: 0,
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-background)' }}>
      <LeftPanel t={t} />

      {/* ── RIGHT PANEL ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2.5rem', background: 'var(--color-surface-container-lowest)', overflowY: 'auto' }}>
        <AnimatePresence mode="wait">
          {!isRegistering ? (
            /* ─── LOGIN FORM ─── */
            <motion.div
              key="login"
              initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              style={{ width: '100%', maxWidth: '26rem' }}
            >
              <div className="login-mobile-logo" style={{ marginBottom: '2rem' }}>
                <SmilefixLogo size="md" />
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontFamily: 'Manrope, sans-serif', fontSize: '2rem', fontWeight: 800, color: 'var(--color-on-surface)', lineHeight: 1.2, marginBottom: '0.5rem' }}>
                  {t('auth.welcomeBack')}
                </h1>
                <p style={{ fontSize: '0.9375rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
                  {t('auth.signInSubtitle')}
                </p>
              </div>

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Email */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label htmlFor="login-email" style={labelStyle}>{t('auth.emailAddress')}</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={iconPos('start')}><Mail size={16} /></span>
                    <input
                      id="login-email" type="email" autoComplete="email" required
                      value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="dr.smith@smilefix.com"
                      style={inputBaseStyle(isRTL)}
                      onFocus={onFocus} onBlur={onBlur}
                    />
                  </div>
                </div>

                {/* Password */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label htmlFor="login-password" style={labelStyle}>{t('auth.password')}</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={iconPos('start')}><Lock size={16} /></span>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password" required
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      style={inputPasswordStyle(isRTL)}
                      onFocus={onFocus} onBlur={onBlur}
                    />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}
                      aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                      style={togglePos}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Remember + Forgot */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                    <input type="checkbox" style={{ width: '1rem', height: '1rem', accentColor: 'var(--color-primary)', cursor: 'pointer', flexShrink: 0 }} />
                    {t('auth.rememberMe')}
                  </label>
                  <Link
                    to={ROUTES.FORGOT_PASSWORD}
                    style={{ fontSize: '0.875rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}
                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                  >
                    {t('auth.forgotPassword')}
                  </Link>
                </div>

                {loginError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ fontSize: '0.875rem', color: 'var(--color-error)', background: 'var(--color-error-container)', padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-DEFAULT)' }}
                  >
                    {loginError}
                  </motion.p>
                )}

                <Button type="submit" fullWidth loading={loading} size="lg" style={{ marginTop: '0.25rem', height: '3.25rem', fontSize: '1rem', fontWeight: 700 }}>
                  {t('auth.signIn')}
                </Button>
              </form>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.75rem 0' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--color-outline-variant)', opacity: 0.3 }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--color-outline)' }}>{t('common.or')}</span>
                <div style={{ flex: 1, height: 1, background: 'var(--color-outline-variant)', opacity: 0.3 }} />
              </div>

              {/* Demo hint */}
              <div style={{ background: 'rgba(0,105,111,0.06)', border: '1px solid rgba(0,105,111,0.18)', borderRadius: 'var(--radius-md)', padding: '1rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
                  <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{t('auth.demoCredentials')}</span>
                </p>
              </div>

              {/* Create account link */}
              <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginTop: '1.5rem' }}>
                {t('auth.noAccount')}{' '}
                <button
                  type="button"
                  onClick={() => setIsRegistering(true)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#61bec5', fontWeight: 600, fontSize: '0.875rem' }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  {t('auth.createAccount')}
                </button>
              </p>
            </motion.div>
          ) : (
            /* ─── REGISTER FORM ─── */
            <motion.div
              key="register"
              initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              style={{ width: '100%', maxWidth: '26rem' }}
            >
              <div className="login-mobile-logo" style={{ marginBottom: '2rem' }}>
                <SmilefixLogo size="md" />
              </div>

              {regDone ? (
                /* Success state */
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: 'rgba(97,190,197,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', color: '#61bec5' }}>
                    <CheckCircle2 size={36} />
                  </div>
                  <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-on-surface)', marginBottom: '0.5rem' }}>
                    {t('auth.accountCreated')}
                  </h2>
                  <p style={{ fontSize: '0.9375rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6, marginBottom: '2rem' }}>
                    {t('auth.accountCreatedMsg')}
                  </p>
                  <Button fullWidth size="lg" onClick={switchToLogin} style={{ height: '3.25rem', fontSize: '1rem', fontWeight: 700 }}>
                    {t('auth.backToSignIn')}
                  </Button>
                </motion.div>
              ) : (
                <>
                  {/* Back link */}
                  <button
                    type="button"
                    onClick={switchToLogin}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-on-surface-variant)', fontSize: '0.875rem', fontWeight: 600, padding: 0, marginBottom: '1.5rem' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-on-surface)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-on-surface-variant)')}
                  >
                    <ArrowLeft size={15} style={{ transform: isRTL ? 'scaleX(-1)' : undefined }} />
                    {t('auth.backToLogin')}
                  </button>

                  <div style={{ marginBottom: '1.75rem' }}>
                    <h1 style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.875rem', fontWeight: 800, color: 'var(--color-on-surface)', lineHeight: 1.2, marginBottom: '0.5rem' }}>
                      {t('auth.createYourAccount')}
                    </h1>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
                      {t('auth.joinSmileFix')}
                    </p>
                  </div>

                  <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
                    {/* First + Last name */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }} className="reg-name-grid">
                      {/* First name */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <label htmlFor="reg-first" style={labelStyle}>{t('auth.firstName')}</label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <span style={iconPos('start')}><UserIcon size={15} /></span>
                          <input
                            id="reg-first" type="text" autoComplete="given-name" required
                            value={firstName}
                            onChange={(e) => { setFirstName(e.target.value); setRegErrors((p) => ({ ...p, firstName: '' })) }}
                            placeholder="Jane"
                            style={{ ...inputBaseStyle(isRTL), borderColor: regErrors.firstName ? 'var(--color-error)' : undefined }}
                            onFocus={onFocus} onBlur={regErrors.firstName ? onBlurError : onBlur}
                          />
                        </div>
                        {regErrors.firstName && <p style={{ fontSize: '0.75rem', color: 'var(--color-error)' }}>{regErrors.firstName}</p>}
                      </div>
                      {/* Last name */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <label htmlFor="reg-last" style={labelStyle}>{t('auth.lastName')}</label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <span style={iconPos('start')}><UserIcon size={15} /></span>
                          <input
                            id="reg-last" type="text" autoComplete="family-name" required
                            value={lastName}
                            onChange={(e) => { setLastName(e.target.value); setRegErrors((p) => ({ ...p, lastName: '' })) }}
                            placeholder="Smith"
                            style={{ ...inputBaseStyle(isRTL), borderColor: regErrors.lastName ? 'var(--color-error)' : undefined }}
                            onFocus={onFocus} onBlur={regErrors.lastName ? onBlurError : onBlur}
                          />
                        </div>
                        {regErrors.lastName && <p style={{ fontSize: '0.75rem', color: 'var(--color-error)' }}>{regErrors.lastName}</p>}
                      </div>
                    </div>

                    {/* Email */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <label htmlFor="reg-email" style={labelStyle}>{t('auth.emailAddress')}</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <span style={iconPos('start')}><Mail size={16} /></span>
                        <input
                          id="reg-email" type="email" autoComplete="email" required
                          value={regEmail}
                          onChange={(e) => { setRegEmail(e.target.value); setRegErrors((p) => ({ ...p, regEmail: '' })) }}
                          placeholder="jane.smith@clinic.com"
                          style={{ ...inputBaseStyle(isRTL), borderColor: regErrors.regEmail ? 'var(--color-error)' : undefined }}
                          onFocus={onFocus} onBlur={regErrors.regEmail ? onBlurError : onBlur}
                        />
                      </div>
                      {regErrors.regEmail && <p style={{ fontSize: '0.75rem', color: 'var(--color-error)' }}>{regErrors.regEmail}</p>}
                    </div>

                    {/* Password */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <label htmlFor="reg-password" style={labelStyle}>{t('auth.password')}</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <span style={iconPos('start')}><Lock size={16} /></span>
                        <input
                          id="reg-password"
                          type={showRegPass ? 'text' : 'password'}
                          autoComplete="new-password" required
                          value={regPassword}
                          onChange={(e) => { setRegPassword(e.target.value); setRegErrors((p) => ({ ...p, regPassword: '' })) }}
                          placeholder={t('auth.minChars')}
                          style={{ ...inputPasswordStyle(isRTL), borderColor: regErrors.regPassword ? 'var(--color-error)' : undefined }}
                          onFocus={onFocus} onBlur={regErrors.regPassword ? onBlurError : onBlur}
                        />
                        <button type="button" onClick={() => setShowRegPass((v) => !v)} tabIndex={-1} style={togglePos}>
                          {showRegPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {regErrors.regPassword && <p style={{ fontSize: '0.75rem', color: 'var(--color-error)' }}>{regErrors.regPassword}</p>}
                    </div>

                    {/* Confirm Password */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <label htmlFor="reg-confirm" style={labelStyle}>{t('auth.confirmPassword')}</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <span style={iconPos('start')}><Lock size={16} /></span>
                        <input
                          id="reg-confirm"
                          type={showConfirm ? 'text' : 'password'}
                          autoComplete="new-password" required
                          value={confirmPassword}
                          onChange={(e) => { setConfirmPassword(e.target.value); setRegErrors((p) => ({ ...p, confirmPassword: '' })) }}
                          placeholder={t('auth.reEnterPassword')}
                          style={{
                            ...inputPasswordStyle(isRTL),
                            borderColor: regErrors.confirmPassword
                              ? 'var(--color-error)'
                              : confirmPassword && confirmPassword === regPassword
                              ? '#61bec5'
                              : undefined,
                          }}
                          onFocus={onFocus} onBlur={regErrors.confirmPassword ? onBlurError : onBlur}
                        />
                        <button type="button" onClick={() => setShowConfirm((v) => !v)} tabIndex={-1} style={togglePos}>
                          {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {regErrors.confirmPassword ? (
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-error)' }}>{regErrors.confirmPassword}</p>
                      ) : confirmPassword && confirmPassword === regPassword ? (
                        <p style={{ fontSize: '0.75rem', color: '#61bec5', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <CheckCircle2 size={12} /> {t('auth.passwordsMatch')}
                        </p>
                      ) : null}
                    </div>

                    <Button type="submit" fullWidth loading={regLoading} size="lg" style={{ marginTop: '0.25rem', height: '3.25rem', fontSize: '1rem', fontWeight: 700 }}>
                      {t('auth.signUp')}
                    </Button>
                  </form>

                  <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginTop: '1.5rem' }}>
                    {t('auth.alreadyHaveAccount')}{' '}
                    <button
                      type="button"
                      onClick={switchToLogin}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#61bec5', fontWeight: 600, fontSize: '0.875rem' }}
                      onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                      onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                    >
                      {t('auth.signIn')}
                    </button>
                  </p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        @media (max-width: 1023px) {
          .login-left-panel  { display: none !important; }
          .login-mobile-logo { display: block !important; }
        }
        @media (min-width: 1024px) {
          .login-mobile-logo { display: none !important; }
        }
        @media (max-width: 480px) {
          .reg-name-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
