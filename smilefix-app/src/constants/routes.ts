export const ROUTES = {
  // Auth
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',

  // Dashboard
  DASHBOARD: '/',

  // Patients
  PATIENTS: '/patients',
  PATIENT_DETAIL: '/patients/:id',
  PATIENT_NEW: '/patients/new',
  PATIENT_ODONTOGRAM: '/patients/:id/odontogram',

  // Calendar / Appointments
  CALENDAR: '/calendar',

  // Treatments
  TREATMENTS: '/treatments',
  TREATMENT_DETAIL: '/treatments/:id',

  // Finance
  FINANCE: '/finance',
  INVOICE_DETAIL: '/finance/invoices/:id',

  // Inventory
  INVENTORY: '/inventory',
  LAB: '/lab',
  SUPPLIERS: '/suppliers',

  // Staff
  STAFF: '/staff',
  STAFF_DETAIL: '/staff/:id',

  // Reports
  REPORTS: '/reports',

  // Notifications
  NOTIFICATIONS: '/notifications',

  // Settings
  SETTINGS: '/settings',
  SETTINGS_PROFILE: '/settings?tab=profile',
} as const
