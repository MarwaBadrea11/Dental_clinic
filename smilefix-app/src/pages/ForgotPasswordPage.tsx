import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { SmilefixLogo } from '@/components/ui/SmilefixLogo'
import { ROUTES } from '@/constants/routes'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email) { setError(t('auth.emailAddress')); return }
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1000))
    setLoading(false)
    setSent(true)
  }

  return (
    <div className="min-h-screen flex bg-[var(--color-background)]">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col">
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)' }}
        />
        <div className="absolute top-[-80px] right-[-80px] w-80 h-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-[-60px] left-[-60px] w-64 h-64 rounded-full bg-[var(--color-primary-fixed)]/20 blur-2xl" />

        <div className="relative z-10 flex flex-col h-full p-12">
          <SmilefixLogo size="md" light />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-auto mb-auto"
          >
            <div className="w-20 h-20 rounded-[var(--radius-xl)] bg-white/20 flex items-center justify-center mb-6 text-4xl">
              🔐
            </div>
            <h2
              className="text-4xl font-bold text-white leading-tight mb-4"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              {t('auth.secureRecovery')}
            </h2>
            <p className="text-white/70 text-lg leading-relaxed max-w-sm">
              {t('auth.secureDesc')}
            </p>

            {/* Security badges */}
            <div className="flex flex-col gap-3 mt-8">
              {[
                { icon: '🔒', text: t('auth.encryptedLink') },
                { icon: '⏱', text: t('auth.linkExpiry') },
                { icon: '🛡', text: t('auth.hipaaCompliant') },
              ].map((item, i) => (
                <motion.div
                  key={item.text}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 + i * 0.08 }}
                  className="flex items-center gap-3 text-white/80 text-sm"
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.text}
                </motion.div>
              ))}
            </div>
          </motion.div>

          <p className="text-white/40 text-xs">
            © 2024 SmileFix. {t('auth.trustedBy')}
          </p>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <SmilefixLogo size="md" />
          </div>

          {/* Back link */}
          <Link
            to={ROUTES.LOGIN}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors mb-8 group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            {t('auth.backToSignIn')}
          </Link>

          <AnimatePresence mode="wait">
            {!sent ? (
              /* ── Request form ── */
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-8">
                  <h1
                    className="text-2xl font-bold text-[var(--color-on-surface)]"
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                  >
                    {t('auth.resetPassword')}
                  </h1>
                  <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">
                    {t('auth.resetSubtitle')}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label={t('auth.emailAddress')}
                    type="email"
                    placeholder="dr.smith@smilefix.com"
                    leftIcon={<Mail size={16} />}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    hint={t('auth.signInSubtitle')}
                    required
                    autoComplete="email"
                  />

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-[var(--color-error)] bg-[var(--color-error-container)] px-3 py-2 rounded-[var(--radius-DEFAULT)]"
                    >
                      {error}
                    </motion.p>
                  )}

                  <Button type="submit" fullWidth loading={loading} size="lg">
                    {t('auth.sendResetLink')}
                  </Button>
                </form>

                <p className="text-center text-xs text-[var(--color-on-surface-variant)] mt-6">
                  Remember your password?{' '}
                  <Link to={ROUTES.LOGIN} className="text-[var(--color-primary)] hover:underline font-medium">
                    {t('auth.backToSignIn')}
                  </Link>
                </p>
              </motion.div>
            ) : (
              /* ── Success state ── */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
                  className="w-20 h-20 rounded-full bg-[var(--color-secondary-container)]/30 flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle2 size={40} className="text-[var(--color-secondary)]" />
                </motion.div>

                <h2
                  className="text-2xl font-bold text-[var(--color-on-surface)] mb-2"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  {t('auth.checkInbox')}
                </h2>
                <p className="text-sm text-[var(--color-on-surface-variant)] mb-2">
                  {t('auth.weSentLink')}
                </p>
                <p className="font-semibold text-[var(--color-primary)] mb-6">{email}</p>

                <div className="bg-[var(--color-surface-container-low)] rounded-[var(--radius-md)] p-4 text-left space-y-2 mb-6">
                  {[
                    t('auth.checkSpam'),
                    t('auth.linkExpires'),
                    t('auth.onlyLatest'),
                  ].map((tip, i) => (
                    <p key={i} className="text-xs text-[var(--color-on-surface-variant)] flex items-start gap-2">
                      <span className="text-[var(--color-primary)] mt-0.5">•</span>
                      {tip}
                    </p>
                  ))}
                </div>

                <Button
                  variant="outline"
                  fullWidth
                  size="lg"
                  onClick={() => { setSent(false); setEmail('') }}
                >
                  {t('auth.tryDifferentEmail')}
                </Button>

                <Link
                  to={ROUTES.LOGIN}
                  className="block mt-4 text-sm text-[var(--color-primary)] hover:underline font-medium"
                >
                  {t('auth.backToSignIn')}
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
