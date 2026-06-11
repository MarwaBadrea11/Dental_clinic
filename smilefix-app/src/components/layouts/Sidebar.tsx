import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, CalendarDays, Stethoscope,
  CreditCard, Package, UserCheck, BarChart3,
  Bell, Settings, X, ChevronLeft,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'
import { SmilefixLogo } from '@/components/ui/SmilefixLogo'
import { NAV_ITEMS, BOTTOM_NAV_ITEMS } from '@/constants/navigation'
import { useUIStore } from '@/store/uiStore'

const iconMap: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard size={20} />,
  Users:           <Users size={20} />,
  CalendarDays:    <CalendarDays size={20} />,
  Stethoscope:     <Stethoscope size={20} />,
  CreditCard:      <CreditCard size={20} />,
  Package:         <Package size={20} />,
  UserCheck:       <UserCheck size={20} />,
  BarChart3:       <BarChart3 size={20} />,
  Bell:            <Bell size={20} />,
  Settings:        <Settings size={20} />,
}

const SIDEBAR_WIDTH = 256
const SIDEBAR_COLLAPSED_WIDTH = 72

export function Sidebar() {
  const { sidebarOpen, sidebarCollapsed, setSidebarOpen, toggleSidebarCollapsed, language } = useUIStore()
  const { t } = useTranslation()
  const isRTL = language === 'ar'

  // فحص حجم الشاشة الحالي لتفادي تداخل قيم x بين الموبايل والدسكتوب
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024

  // Nav item labels from i18n
  const navLabels: Record<string, string> = {
    dashboard:     t('nav.dashboard'),
    patients:      t('nav.patients'),
    calendar:      t('nav.calendar'),
    treatments:    t('nav.treatments'),
    finance:       t('nav.finance'),
    inventory:     t('nav.inventory'),
    staff:         t('nav.staff'),
    reports:       t('nav.reports'),
    notifications: t('nav.notifications'),
    settings:      t('nav.settings'),
  }

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <motion.aside
        initial={false}
        animate={{
          // هنا يكمن الحل: في الشاشات الكبيرة يكون الـ x دائماً 0، وفي الموبايل يتحرك حسب الاتجاه وحالة الفتح
          x: isMobile 
            ? (sidebarOpen ? 0 : (isRTL ? SIDEBAR_WIDTH : -SIDEBAR_WIDTH)) 
            : 0,
          width: sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        className={cn(
          'fixed top-0 h-full z-40',
          isRTL ? 'right-0' : 'left-0',
          'glass-sidebar border-[var(--color-outline-variant)]/20',
          isRTL ? 'border-l' : 'border-r',
          'shadow-[var(--shadow-sidebar)]',
          'flex flex-col'
          // تم إزالة lg:translate-x-0 لمنع التضارب مع حركات Framer Motion
        )}
        style={{ width: sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH }}
      >
        {/* ── Logo ── */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-[var(--color-outline-variant)]/15 overflow-hidden">
          {sidebarCollapsed
            ? <SmilefixLogo size="sm" variant="icon" />
            : <SmilefixLogo size="sm" />
          }
          {/* Mobile close */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-[var(--radius-DEFAULT)] text-[var(--color-outline)] hover:bg-[var(--color-surface-container-high)] transition-colors lg:hidden focus:outline-none"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Nav items ── */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === '/'}
              // عند الضغط على أي عنصر في الموبايل، يغلق السايد بار تلقائياً لتسهيل تجربة المستخدم
              onClick={() => isMobile && setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-DEFAULT)]',
                  'text-sm font-medium transition-all duration-200 group',
                  isActive
                    ? 'bg-[var(--color-primary-container)]/30 text-[var(--color-primary)] font-semibold'
                    : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)] hover:text-[var(--color-on-surface)] hover:translate-x-0.5'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn('shrink-0 transition-colors', isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-outline)]')}>
                    {iconMap[item.icon]}
                  </span>
                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.1 }}
                        className="truncate"
                      >
                        {navLabels[item.id] ?? item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {isActive && !sidebarCollapsed && (
                    <motion.div
                      layoutId="activeIndicator"
                      className={cn('w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]', isRTL ? 'mr-auto' : 'ml-auto')}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ── Bottom nav ── */}
        <div className="border-t border-[var(--color-outline-variant)]/15 py-3 px-2 space-y-0.5">
          {BOTTOM_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={() => isMobile && setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-DEFAULT)]',
                  'text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-[var(--color-primary-container)]/30 text-[var(--color-primary)]'
                    : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)] hover:text-[var(--color-on-surface)]'
                )
              }
            >
              <span className="shrink-0 text-[var(--color-outline)]">{iconMap[item.icon]}</span>
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className="truncate"
                  >
                    {navLabels[item.id] ?? item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          ))}

          {/* Collapse toggle — desktop only */}
          <button
            onClick={toggleSidebarCollapsed}
            className={cn(
              'hidden lg:flex w-full items-center gap-3 px-3 py-2.5 rounded-[var(--radius-DEFAULT)]',
              'text-sm text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]',
              'transition-all duration-200'
            )}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <motion.span
              animate={{ rotate: sidebarCollapsed ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 text-[var(--color-outline)]"
            >
              <ChevronLeft size={20} />
            </motion.span>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                >
                  {t('nav.collapse')}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>
    </>
  )
}