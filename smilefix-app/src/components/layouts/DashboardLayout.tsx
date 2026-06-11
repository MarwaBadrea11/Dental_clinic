import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useUIStore } from '@/store/uiStore'
import { useNotificationSync } from '@/hooks/useNotificationSync'
import { motion } from 'framer-motion'

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

      {/*
        Responsive content offset:
        - Mobile (<lg): sidebar is a drawer overlay → NO margin on content
        - Desktop (≥lg): content shifts by sidebarWidth via CSS variable
        We avoid Framer Motion inline-style on mobile by using a CSS class
        that sets the margin only above the lg breakpoint.
      */}
      <main
        className="main-content min-h-screen pt-16 min-w-0"
        style={
          {
            '--sidebar-w': `${sidebarWidth}px`,
          } as React.CSSProperties
        }
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
      </main>

      {/* Inject scoped CSS so the margin only activates on desktop */}
      <style>{`
        /* Mobile: sidebar is a drawer — content fills full width */
        .main-content {
          margin-left: 0;
          margin-right: 0;
          transition: margin 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        /* Desktop: push content past the sidebar */
        @media (min-width: 1024px) {
          ${isRTL
            ? '.main-content { margin-right: var(--sidebar-w); margin-left: 0; }'
            : '.main-content { margin-left: var(--sidebar-w); margin-right: 0; }'
          }
        }
      `}</style>
    </div>
  )
}
