import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useUIStore } from '@/store/uiStore'
import { useNotificationSync } from '@/hooks/useNotificationSync'

const SIDEBAR_FULL      = 256
const SIDEBAR_COLLAPSED = 72

// Map path → i18n key
const PATH_TO_KEY: Record<string, string> = {
  '/':              'nav.dashboard',
  '/patients':      'nav.patients',
  '/calendar':      'nav.calendar',
  '/treatments':    'nav.treatments',
  '/finance':       'nav.finance',
  '/inventory':     'nav.inventory',
  '/staff':         'nav.staff',
  '/reports':       'nav.reports',
  '/notifications': 'nav.notifications',
  '/settings':      'nav.settings',
}

function getPageKey(pathname: string): string {
  if (pathname === '/') return 'nav.dashboard'
  const match = Object.keys(PATH_TO_KEY).find(
    (p) => p !== '/' && pathname.startsWith(p)
  )
  return match ? PATH_TO_KEY[match] : 'nav.dashboard'
}

/** Reactive desktop breakpoint hook — updates on window resize */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isDesktop
}

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { sidebarCollapsed, language } = useUIStore()
  const { t }        = useTranslation()
  const location     = useLocation()
  const isRTL        = language === 'ar'
  const isDesktop    = useIsDesktop()

  useNotificationSync()

  const title       = t(getPageKey(location.pathname))
  const sidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_FULL

  /*
    Content offset rules:
    - Mobile  (<lg): no margin — sidebar is a drawer overlay
    - Desktop (≥lg): margin-left (LTR) or margin-right (RTL) = sidebarWidth
  */
  const marginStyle = isDesktop
    ? isRTL
      ? { marginRight: sidebarWidth, marginLeft: 0 }
      : { marginLeft: sidebarWidth, marginRight: 0 }
    : { marginLeft: 0, marginRight: 0 }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <Sidebar />
      <Topbar title={title} sidebarWidth={sidebarWidth} />

      <motion.main
        animate={marginStyle}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="min-h-screen pt-16 min-w-0"
        style={marginStyle}
      >
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="p-3 sm:p-5 lg:p-6 max-w-[1600px] mx-auto min-w-0 w-full"
        >
          {children}
        </motion.div>
      </motion.main>
    </div>
  )
}
