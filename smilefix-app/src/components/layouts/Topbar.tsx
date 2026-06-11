import { useState } from 'react'
import { Menu, Bell, ChevronDown, Sun, Moon, LogIn } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Avatar } from '@/components/ui/Avatar'
import { Dropdown } from '@/components/ui/Dropdown'
import { ExpandableSearch } from '@/components/ui/ExpandableSearch'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { useNotificationStore } from '@/store/notificationStore'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/utils/cn'

interface TopbarProps {
  title: string
  sidebarWidth: number
}

export function Topbar({ title, sidebarWidth }: TopbarProps) {
  const { toggleSidebar, theme, toggleTheme, language } = useUIStore()
  const { user, isAuthenticated, logout } = useAuthStore()
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const isRTL = language === 'ar'

  const handleLogout = async () => {
    await logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  const userMenuItems = [
    { id: 'profile',  label: t('topbar.myProfile'), onClick: () => {} },
    { id: 'settings', label: t('nav.settings'),     onClick: () => navigate(ROUTES.SETTINGS) },
    { id: 'divider',  label: '',                    onClick: () => {}, divider: true },
    { id: 'logout',   label: t('topbar.signOut'),   onClick: handleLogout, danger: true },
  ]

  return (
    <>
      {/*
        Topbar positioning:
        - Mobile (<lg): spans full width (left:0, right:0)
        - Desktop (≥lg): offset by sidebar width
        We use a CSS class + CSS variable instead of Framer Motion inline
        styles so the responsive breakpoint works correctly.
      */}
      <header
        className={cn(
          'topbar fixed top-0 z-30 h-16',
          'glass-panel border-b border-[var(--color-outline-variant)]/20',
          'shadow-[var(--shadow-topbar)]',
          'flex items-center justify-between px-3 sm:px-6 gap-2 sm:gap-4'
        )}
        style={{ '--sidebar-w': `${sidebarWidth}px` } as React.CSSProperties}
      >
        {/* Start: hamburger + title */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {/* Hamburger — always visible on mobile; hidden on desktop */}
          <button
            onClick={toggleSidebar}
            className="flex-shrink-0 p-2 rounded-[var(--radius-DEFAULT)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)] transition-colors lg:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu size={20} />
          </button>
          <h2
            className="text-base sm:text-lg font-bold text-[var(--color-primary)] truncate hidden xs:block"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            {title}
          </h2>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* End: actions + user */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Search — expandable on mobile */}
          <ExpandableSearch
            value={search}
            onChange={setSearch}
            placeholder={t('topbar.search')}
            ariaLabel={t('topbar.search')}
          />

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-[var(--color-on-surface-variant)] hover:bg-[var(--color-primary-container)]/15 transition-colors"
            aria-label={t('topbar.toggleTheme')}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {/* Notifications bell */}
          <Link
            to={ROUTES.NOTIFICATIONS}
            className="relative p-2 rounded-full cursor-pointer text-[var(--color-on-surface-variant)] hover:bg-[var(--color-primary-container)]/15 transition-colors"
            aria-label={t('topbar.notifications')}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-error)] text-white text-[10px] font-bold flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          <div className="w-px h-6 bg-[var(--color-outline-variant)]/30 mx-0.5 sm:mx-1" />

          {/* User menu */}
          {isAuthenticated && user ? (
            <Dropdown
              align={isRTL ? 'left' : 'right'}
              trigger={
                <div className="flex items-center gap-1.5 sm:gap-2 pl-1 sm:pl-2 pr-1 py-1 rounded-full hover:bg-[var(--color-surface-container-high)] transition-colors cursor-pointer">
                  {/* Name + role — hidden on small screens */}
                  <div className="hidden lg:flex flex-col items-end">
                    <p className="text-xs font-semibold text-[var(--color-on-surface)] leading-none">{user.name}</p>
                    <p className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-tight mt-0.5">{user.role}</p>
                  </div>
                  <Avatar name={user.name} size="sm" ring />
                  <ChevronDown size={14} className="text-[var(--color-outline)] hidden sm:block" />
                </div>
              }
              items={userMenuItems}
            />
          ) : (
            <Link
              to={ROUTES.LOGIN}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-container)]/20 transition-colors"
            >
              <LogIn size={16} />
              <span className="hidden sm:inline">{t('auth.login')}</span>
            </Link>
          )}
        </div>
      </header>

      {/* Responsive topbar offset — mobile: full width, desktop: offset by sidebar */}
      <style>{`
        .topbar {
          left: 0;
          right: 0;
          transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                      right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @media (min-width: 1024px) {
          ${isRTL
            ? '.topbar { right: var(--sidebar-w); left: 0; }'
            : '.topbar { left: var(--sidebar-w); right: 0; }'
          }
        }
      `}</style>
    </>
  )
}
