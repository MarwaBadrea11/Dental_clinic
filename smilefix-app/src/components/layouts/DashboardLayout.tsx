import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useUIStore } from '@/store/uiStore'
import { NAV_ITEMS, BOTTOM_NAV_ITEMS } from '@/constants/navigation'
import { useNotificationSync } from '@/hooks/useNotificationSync'

const SIDEBAR_FULL = 256
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

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { sidebarCollapsed, language } = useUIStore()
  const { t } = useTranslation()
  const location = useLocation()
  const isRTL = language === 'ar'

  // Load notifications on mount and poll badge count every 60 s
  useNotificationSync()

  const title = t(getPageKey(location.pathname))
  const sidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_FULL

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <Sidebar />
      <Topbar title={title} sidebarWidth={sidebarWidth} />

      {/* Main content — margin flips for RTL */}
      <motion.main
        animate={isRTL
          ? { marginRight: sidebarWidth, marginLeft: 0 }
          : { marginLeft: sidebarWidth, marginRight: 0 }
        }
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="min-h-screen pt-16 min-w-0"
        style={isRTL
          ? { marginRight: sidebarWidth, marginLeft: 0 }
          : { marginLeft: sidebarWidth, marginRight: 0 }
        }
      >
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="p-6 max-w-[1600px] mx-auto min-w-0 w-full"
        >
          {children}
        </motion.div>
      </motion.main>
    </div>
  )
}
