import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle, AlertCircle, Key, Copy, Cpu, Smartphone, HardDrive, MemoryStick, ShieldAlert } from 'lucide-react'
import { licenseService } from '@/services/licenseService'
import { ROUTES } from '@/constants/routes'

export default function ActivateAppPage() {
  const { t, i18n } = useTranslation('license')
  const navigate = useNavigate()
  const location = useLocation()
  
  const [licenseKey, setLicenseKey] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [activationData, setActivationData] = useState<any>(null)
  const [deviceId, setDeviceId] = useState<string>('')
  const [hardwareInfo, setHardwareInfo] = useState<any>(null)
  const [isLoadingDeviceId, setIsLoadingDeviceId] = useState(true)
  const [copySuccess, setCopySuccess] = useState(false)
  const [hardwareMismatch, setHardwareMismatch] = useState(false)

  const isRTL = i18n.language === 'ar'

  // Only show an error if we were redirected here with a specific security alert
  // (hardware mismatch). Plain PENDING → /activate-app carries no state.
  useEffect(() => {
    const state = location.state as { error?: string; hardwareMismatch?: boolean } | null
    if (state?.hardwareMismatch && state.error) {
      setHardwareMismatch(true)
      setError(state.error)
      // Wipe state so a browser refresh doesn't re-show the alert
      window.history.replaceState({}, '')
    }

    // Also pick up the flag written by App.tsx on boot
    const sessionMismatch = sessionStorage.getItem('hardware_mismatch')
    const sessionMessage  = sessionStorage.getItem('hardware_mismatch_message')
    if (sessionMismatch === 'true' && sessionMessage) {
      setHardwareMismatch(true)
      setError(sessionMessage)
      sessionStorage.removeItem('hardware_mismatch')
      sessionStorage.removeItem('hardware_mismatch_message')
    }
  }, [location])

  // Fetch device ID when component loads
  useEffect(() => {
    let cancelled = false

    const fetchDeviceId = async () => {
      try {
        const deviceData = await licenseService.getDeviceId()

        if (cancelled) return

        // Defensively extract the code — licenseService guarantees a non-empty
        // string, but we guard here too in case something slips through.
        const code =
          deviceData?.activationRequestCode ||
          deviceData?.deviceId ||
          `LOCAL-${Date.now().toString(16)}`

        setDeviceId(code)
        setHardwareInfo(deviceData?.hardwareInfo ?? null)
      } catch (err) {
        // licenseService.getDeviceId() never throws (it catches internally),
        // but guard here just in case.
        if (!cancelled) {
          console.error('Unexpected error fetching device ID:', err)
          setDeviceId(`ERROR-${Date.now().toString(16)}`)
        }
      } finally {
        if (!cancelled) setIsLoadingDeviceId(false)
      }
    }

    fetchDeviceId()

    return () => { cancelled = true }
  }, [])

  // Copy device ID to clipboard
  const handleCopyDeviceId = async () => {
    try {
      await navigator.clipboard.writeText(deviceId)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    // Clear any previous hardware mismatch flags
    if (hardwareMismatch) {
      setHardwareMismatch(false)
    }

    // Check for development master key to bypass activation
    if (licenseKey === 'SMILEFIX-DEV-MASTER-99X2') {
      // Skip backend API call and simulate successful activation
      localStorage.setItem('license_activated', 'true')
      localStorage.setItem('license_bypass', 'true')
      
      // Also set authentication tokens to bypass login
      // Create a mock JWT token (header.payload.signature format)
      const mockAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImRldi1tYXN0ZXIiLCJlbWFpbCI6ImRldkBzbWlsZWZpeC5jb20iLCJyb2xlIjoiQURNSU4iLCJuYW1lIjoiRGV2ZWxvcG1lbnQgTWFzdGVyIiwiaWF0IjoxNzQxNzcxMjAwLCJleHAiOjI1MDU3NzEyMDB9.fake-signature-for-development-only'
      const mockRefreshToken = 'mock-refresh-token-for-development'
      
      localStorage.setItem('smilefix_access_token', mockAccessToken)
      localStorage.setItem('smilefix_refresh_token', mockRefreshToken)
      localStorage.setItem('smilefix_user', JSON.stringify({
        id: 'dev-master',
        email: 'dev@smilefix.com',
        role: 'ADMIN',
        name: 'Development Master'
      }))
      
      // Monkey-patch licenseService.checkLicenseStatus to return valid license when bypass is active
      const originalCheck = licenseService.checkLicenseStatus;
      licenseService.checkLicenseStatus = async function() {
        if (localStorage.getItem('license_bypass') === 'true') {
          return {
            status: 'ACTIVE',
            valid: true,
            activatedAt: new Date().toISOString(),
            lastVerifiedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
            maxUsers: 999,
            customerName: customerName || 'Development User',
            customerEmail: customerEmail || 'dev@smilefix.com',
            message: 'Development bypass active'
          };
        }
        return originalCheck.apply(this, arguments as unknown as []);
      };
      
      setSuccess(true)
      setActivationData({
        status: 'ACTIVE',
        activatedAt: new Date().toISOString(),
        customerName: customerName || 'Development User',
      })
      
      // Signal LicenseGuard to skip its immediate re-check
      sessionStorage.setItem('license_just_activated', 'true')

      // Dev bypass has a real (mock) JWT so we can go straight to dashboard
      navigate(ROUTES.DASHBOARD)
      setIsLoading(false)
      return
    }

    try {
      // Clear any previous license data before attempting new activation
      // This prevents conflicts with old hardware-bound licenses
      localStorage.removeItem('license_activated')
      localStorage.removeItem('license_bypass')
      
      const result = await licenseService.activateLicense({
        licenseKey,
        customerName: customerName || undefined,
        customerEmail: customerEmail || undefined,
      })

      setSuccess(true)
      setActivationData(result)
      
      // Check if this is a hardware-bound license activation
      const isHardwareBound = licenseKey.startsWith('HARDWARE-')
      
      if (isHardwareBound) {
        console.log('✅ Hardware-bound license activated successfully')
        console.log('🔒 Software is now permanently bound to this computer')
        localStorage.setItem('license_activated', 'true')
        localStorage.setItem('license_type', 'hardware-bound')
      }

      // Signal to LicenseGuard that the license was just validated so it
      // skips an immediate re-check and doesn't redirect back to /activate-app.
      sessionStorage.setItem('license_just_activated', 'true')
      
      // After activation the user has no auth session yet — send them to
      // /login so they can authenticate and land on the dashboard normally.
      setTimeout(() => {
        navigate(ROUTES.LOGIN)
      }, 3000)

    } catch (err: any) {
      setError(err.message || t('activation.failed'))
      
      // Check for specific hardware-bound license errors
      if (err.message.includes('hardware') || err.message.includes('Hardware')) {
        console.error('Hardware-bound license activation error:', err.message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetry = async () => {
    // Check for development bypass flag
    if (localStorage.getItem('license_bypass') === 'true' && localStorage.getItem('smilefix_access_token')) {
      navigate(ROUTES.DASHBOARD)
      return
    }
    
    try {
      const status = await licenseService.checkLicenseStatus()
      
      // Special handling for hardware mismatch
      if (status.status === 'REVOKED' && status.hardwareMismatch === true) {
        setHardwareMismatch(true)
        setError('This software has been copied to another computer. License revoked.')
        return
      }
      
      if (status.valid && status.status === 'ACTIVE') {
        navigate(ROUTES.DASHBOARD)
      }
    } catch (error) {
      console.error('License check failed:', error)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="md:flex">
              {/* Left side - Success Illustration */}
              <div className="md:w-2/5 bg-gradient-to-br from-green-600 to-emerald-700 dark:from-green-800 dark:to-emerald-900 p-8 md:p-12 text-white flex flex-col justify-center items-center text-center">
                <div className="w-32 h-32 bg-white/20 rounded-3xl flex items-center justify-center mb-8">
                  <CheckCircle className="h-20 w-20 text-white" />
                </div>
                <h1 className="text-3xl font-bold mb-4">
                  {t('activation.success.title')}
                </h1>
                <p className="text-green-100 text-lg">
                  {t('activation.success.description')}
                </p>
              </div>

              {/* Right side - Success Details */}
              <div className="md:w-3/5 p-8 md:p-12">
                <div className="space-y-8">
                  <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-2xl p-6">
                    <div className="flex items-center">
                      <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400 mr-4 flex-shrink-0" />
                      <p className="text-green-800 dark:text-green-300 text-lg font-medium">
                        {t('activation.success.message')}
                      </p>
                    </div>
                  </div>

                  {activationData && (
                    <div className="space-y-6 bg-gray-50 dark:bg-gray-800 p-6 rounded-2xl">
                      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                        Activation Details
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('activation.status')}
                          </p>
                          <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                            {activationData.status}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('activation.activatedAt')}
                          </p>
                          <p className="text-lg font-semibold">
                            {new Date(activationData.activatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        {activationData.expiresAt && (
                          <div className="space-y-2">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {t('activation.expiresAt')}
                            </p>
                            <p className="text-lg font-semibold">
                              {new Date(activationData.expiresAt).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                        {activationData.customerName && (
                          <div className="space-y-2">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {t('activation.customerName')}
                            </p>
                            <p className="text-lg font-semibold">{activationData.customerName}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="pt-6">
                    <div className="text-center mb-6">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 mb-3">
                        <svg className="h-6 w-6 text-blue-600 dark:text-blue-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                        </svg>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 font-medium">
                        {t('activation.redirecting')}
                      </p>
                    </div>

                    <button
                      onClick={() => navigate(ROUTES.LOGIN)}
                      className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl transition-all flex items-center justify-center font-semibold text-lg shadow-lg hover:shadow-xl"
                    >
                      {t('activation.goToDashboard', 'Continue to Login')} →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center justify-center p-6 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="md:flex">
            {/* Left side - Brand/Info */}
            <div className="md:w-2/5 bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-800 dark:to-indigo-900 p-8 md:p-12 text-white flex flex-col justify-center">
              <div className="mb-8">
                <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                  <Key className="h-12 w-12 text-white" />
                </div>
                <h1 className="text-3xl font-bold mb-4">
                  {t('activation.title')}
                </h1>
                <p className="text-blue-100">
                  {t('activation.description')}
                </p>
              </div>
              
              <div className="mt-8 space-y-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mr-3">
                    <span className="text-sm font-bold">1</span>
                  </div>
                  <span className="text-blue-100">Enter your license key</span>
                </div>
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mr-3">
                    <span className="text-sm font-bold">2</span>
                  </div>
                  <span className="text-blue-100">Activate your system</span>
                </div>
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mr-3">
                    <span className="text-sm font-bold">3</span>
                  </div>
                  <span className="text-blue-100">Access full features</span>
                </div>
              </div>
            </div>

            {/* Right side - Form */}
            <div className="md:w-3/5 p-8 md:p-12">
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className={`rounded-xl p-4 ${hardwareMismatch 
                    ? 'bg-red-100 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700' 
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  }`}>
                    <div className="flex items-start">
                      {hardwareMismatch ? (
                        <ShieldAlert className="h-6 w-6 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0 animate-pulse" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className={`font-semibold ${hardwareMismatch ? 'text-red-900 dark:text-red-300 text-lg' : 'text-red-800 dark:text-red-300'}`}>
                          {hardwareMismatch ? '🚨 SECURITY ALERT' : 'Activation Error'}
                        </p>
                        <p className="text-red-700 dark:text-red-400 mt-1">{error}</p>
                        {hardwareMismatch && (
                          <div className="mt-3 pt-3 border-t border-red-300 dark:border-red-700">
                            <p className="text-sm text-red-600 dark:text-red-500">
                              <strong>Solution:</strong> Contact support with your Activation Request Code below to obtain a new hardware-bound license key for this computer.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Device ID / Activation Request Code */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3">
                        <Cpu className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                          {t('activation.deviceId.title', 'Activation Request Code')}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t('activation.deviceId.description', 'Your unique device identifier for offline licensing')}
                        </p>
                      </div>
                    </div>
                    {hardwareInfo?.isFallback && (
                      <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-300 text-xs font-medium rounded-full">
                        {t('activation.deviceId.fallback', 'Fallback Mode')}
                      </span>
                    )}
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        {isLoadingDeviceId ? (
                          <div className="flex items-center">
                            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3"></div>
                            <span className="text-gray-600 dark:text-gray-400">
                              {t('activation.deviceId.loading', 'Loading device information...')}
                            </span>
                          </div>
                        ) : deviceId ? (
                          <div>
                            <p className="font-mono text-lg font-bold text-gray-900 dark:text-gray-100 break-all">
                              {deviceId}
                            </p>
                            {hardwareInfo && (
                              <div className="flex flex-wrap gap-3 mt-3">
                                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                  <HardDrive className="h-3 w-3 mr-1" />
                                  <span>{hardwareInfo.hostname}</span>
                                </div>
                                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                  <Cpu className="h-3 w-3 mr-1" />
                                  <span>{hardwareInfo.cpuCores}核 • {hardwareInfo.cpuModel}</span>
                                </div>
                                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                  <MemoryStick className="h-3 w-3 mr-1" />
                                  <span>{hardwareInfo.totalMemory}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Backend unreachable — show a retry prompt instead of blank */
                          <div className="flex items-center text-amber-700 dark:text-amber-400">
                            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                            <span className="text-sm">
                              {t('activation.deviceId.unavailable', 'Could not reach the server. Start the backend and refresh the page.')}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 ml-4">
                        <button
                          type="button"
                          onClick={handleCopyDeviceId}
                          disabled={isLoadingDeviceId || !deviceId}
                          className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${copySuccess
                            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {copySuccess ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              {t('activation.deviceId.copied', 'Copied!')}
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-2" />
                              {t('activation.deviceId.copy', 'Copy')}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-blue-100 dark:border-blue-800">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t('activation.deviceId.instructions', 'Send this code to support to receive your hardware-bound license key. This ensures the software only works on this specific computer.')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* License Key Input */}
                <div>
                  <label htmlFor="licenseKey" className="block text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
                    {t('activation.licenseKey')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="licenseKey"
                    type="text"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    placeholder={t('activation.licenseKeyPlaceholder', 'Enter your hardware-bound license key')}
                    required
                    disabled={isLoading}
                    className="w-full px-4 py-4 text-lg border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono disabled:opacity-50 disabled:cursor-not-allowed focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 focus:outline-none transition-colors"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {t('activation.licenseKeyHint', 'Enter the license key provided by support after sending your Activation Request Code above.')}
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('activation.customerName')}
                    </label>
                    <input
                      id="customerName"
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder={t('activation.customerNamePlaceholder')}
                      disabled={isLoading}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('activation.customerEmail')}
                    </label>
                    <input
                      id="customerEmail"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder={t('activation.customerEmailPlaceholder')}
                      disabled={isLoading}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-blue-800 dark:text-blue-300 font-medium mb-2">
                        {t('activation.hardwareNote.title', 'Hardware-Bound License Information')}
                      </p>
                      <ul className="text-blue-700 dark:text-blue-400 text-sm space-y-1 list-disc list-inside pl-2">
                        <li>{t('activation.hardwareNote.1', 'This license is permanently bound to this specific computer hardware.')}</li>
                        <li>{t('activation.hardwareNote.2', 'If you copy the software to another computer, it will automatically lock itself.')}</li>
                        <li>{t('activation.hardwareNote.3', 'No internet connection is required for validation - works completely offline.')}</li>
                        <li>{t('activation.hardwareNote.4', 'For support, provide the Activation Request Code above.')}</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={handleRetry}
                    disabled={isLoading}
                    className="flex-1 py-3 px-6 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {t('activation.checkAgain')}
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !licenseKey}
                    className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-semibold text-lg shadow-lg hover:shadow-xl"
                  >
                    {isLoading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t('activation.activate')}
                      </span>
                    ) : (
                      t('activation.activate')
                    )}
                  </button>
                </div>

                <div className="text-center pt-4">
                  <button
                    type="button"
                    onClick={() => window.open('https://smilefix.com/support', '_blank')}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    {t('activation.needHelp')} →
                  </button>
                </div>
              </form>

              <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-bold text-gray-800 dark:text-gray-300 mb-4 text-lg">
                  {t('activation.troubleshooting.title', 'Hardware Licensing Guide')}
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                      <span className="text-blue-600 dark:text-blue-400 text-xs font-bold">1</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {t('activation.troubleshooting.hardware1', 'Copy the Activation Request Code above and send it to support')}
                    </p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                      <span className="text-blue-600 dark:text-blue-400 text-xs font-bold">2</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {t('activation.troubleshooting.hardware2', 'Support will provide a hardware-bound license key for this specific computer')}
                    </p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                      <span className="text-blue-600 dark:text-blue-400 text-xs font-bold">3</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {t('activation.troubleshooting.hardware3', 'Enter the license key below to activate - no internet required')}
                    </p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                      <span className="text-blue-600 dark:text-blue-400 text-xs font-bold">4</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {t('activation.troubleshooting.hardware4', 'Software automatically locks if copied to another computer')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}