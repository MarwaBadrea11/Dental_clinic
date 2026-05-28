import type { NavItem } from '@/types'

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',    label: 'Dashboard',    icon: 'LayoutDashboard', path: '/' },
  { id: 'patients',     label: 'Patients',     icon: 'Users',           path: '/patients' },
  { id: 'calendar',     label: 'Calendar',     icon: 'CalendarDays',    path: '/calendar' },
  { id: 'treatments',   label: 'Treatments',   icon: 'Stethoscope',     path: '/treatments' },
  { id: 'finance',      label: 'Finance',      icon: 'CreditCard',      path: '/finance' },
  { id: 'inventory',    label: 'Inventory',    icon: 'Package',         path: '/inventory' },
  { id: 'staff',        label: 'Staff',        icon: 'UserCheck',       path: '/staff' },
  { id: 'reports',      label: 'Reports',      icon: 'BarChart3',       path: '/reports' },
]

export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { id: 'notifications', label: 'Notifications', icon: 'Bell',     path: '/notifications' },
  { id: 'settings',      label: 'Settings',      icon: 'Settings', path: '/settings' },
]
