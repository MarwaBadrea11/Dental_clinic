# SmileFix Dental Clinic — Complete Project Context

> **Send this file to any AI assistant** to give it full understanding of the project.  
> Last updated: July 2026

---

## 1. Project Overview

**SmileFix** is a full-stack dental clinic management system composed of **three applications** sharing a single REST API backend:

| App | Tech | Purpose |
|-----|------|---------|
| `dental-clinic-backend` | Node.js + Fastify + PostgreSQL | REST API server |
| `smilefix-app` | React 19 + TypeScript + Vite | Web admin dashboard |
| `smilefix-patient-app` | React Native + Expo 54 | Mobile app for patients |

---

## 2. Repository Structure

```
Dental_clinic/
├── dental-clinic-backend/      ← Node.js REST API (Fastify)
│   ├── src/
│   │   ├── app.js              ← Fastify app factory (buildApp)
│   │   ├── server.js           ← Entry point (starts server)
│   │   ├── config/env.js       ← Zod-validated environment config
│   │   ├── middleware/
│   │   │   ├── authenticate.js ← JWT verification, deny-list
│   │   │   └── authorize.js    ← RBAC permission check + authorizeOwner
│   │   ├── plugins/
│   │   │   ├── knex.js         ← Knex DB plugin
│   │   │   ├── jwt.js          ← @fastify/jwt plugin (RS256)
│   │   │   ├── auditHook.js    ← Global onSend hook for audit logging
│   │   │   └── securityHeaders.js
│   │   ├── modules/            ← Feature modules (controller/service/repo/routes/schema)
│   │   │   ├── auth/
│   │   │   ├── patients/
│   │   │   ├── appointments/
│   │   │   ├── treatments/
│   │   │   ├── procedures/
│   │   │   ├── odontogram/
│   │   │   ├── invoices/       ← also contains finance & patientDebt routes
│   │   │   ├── inventory/
│   │   │   ├── staff/          ← also contains attendance & salary sub-resources
│   │   │   ├── reports/
│   │   │   ├── dashboard/
│   │   │   ├── notifications/
│   │   │   ├── notes/          ← patient notes sub-resource
│   │   │   ├── attachments/    ← patient file uploads (multipart)
│   │   │   ├── roles/          ← stub (Phase 2)
│   │   │   └── health/
│   │   ├── services/
│   │   │   └── audit.service.js
│   │   ├── db/
│   │   │   ├── db.js
│   │   │   ├── knexfile.js
│   │   │   └── migrations/     ← ordered Knex migrations (see §6)
│   │   └── utils/
│   │       ├── errors.js       ← AppError, ValidationError, AuthenticationError
│   │       └── response.js     ← successResponse / errorResponse helpers
│   ├── scripts/
│   │   ├── seed.mjs            ← creates admin/dentist test users
│   │   ├── migrate.mjs         ← runs knex migrations
│   │   ├── check-db.mjs
│   │   └── add-dentist.mjs
│   ├── .env                    ← local secrets (never committed)
│   └── package.json
│
├── smilefix-app/               ← React web admin dashboard
│   └── src/
│       ├── App.tsx             ← session rehydration + router
│       ├── main.tsx            ← ReactDOM root, QueryClientProvider, i18n init
│       ├── routes/AppRouter.tsx← BrowserRouter with lazy pages + guards
│       ├── pages/              ← one file per page (see §8)
│       ├── components/         ← feature components + shared UI
│       │   ├── appointments/
│       │   ├── dashboard/
│       │   ├── finance/
│       │   ├── inventory/
│       │   ├── layouts/        ← DashboardLayout
│       │   ├── odontogram/
│       │   ├── patients/
│       │   ├── reports/
│       │   ├── shared/
│       │   ├── staff/
│       │   ├── treatments/
│       │   └── ui/             ← Loader, Button, etc.
│       ├── services/           ← axios/fetch API calls (one file per module)
│       ├── store/              ← Zustand stores
│       ├── hooks/
│       ├── types/index.ts      ← all TypeScript interfaces
│       ├── i18n/               ← i18next (Arabic + English)
│       ├── constants/routes.ts
│       └── lib/queryClient.ts
│
└── smailfixmobail/
    └── smilefix-patient-app/   ← React Native / Expo patient-facing app
        ├── App.tsx             ← root (ThemeProvider + AppNavigator)
        ├── src/
        │   ├── screens/        ← Welcome, Login, Register, OTPVerify, Home,
        │   │                      Appointments, Booking, Profile, QR
        │   ├── navigation/     ← AppNavigator + types
        │   ├── store/          ← Zustand (appStore with SecureStore hydration)
        │   ├── services/       ← API calls to backend
        │   ├── components/
        │   ├── hooks/
        │   ├── i18n/           ← i18next
        │   └── theme/          ← ThemeContext (light/dark)
        └── package.json
```

---

## 3. Backend Tech Stack

| Concern | Library |
|---------|---------|
| Framework | Fastify v5 |
| Validation | Zod v4 + `fastify-type-provider-zod` |
| ORM / Query | Knex v3 |
| Database | PostgreSQL (pg v8) |
| Auth | `@fastify/jwt` (RS256 asymmetric keys), bcrypt |
| File uploads | `@fastify/multipart` (max 50 MB) |
| Static files | `@fastify/static` → `/uploads/` |
| CORS | `@fastify/cors` (env-configurable) |
| Rate limiting | `@fastify/rate-limit` (per user/IP) |
| Security headers | `@fastify/helmet` (via plugin) |
| License system | `node-machine-id` (hardware fingerprinting) |
| PDF export | pdfkit |
| Excel export | exceljs |
| Task scheduling | node-cron |
| Tests | Vitest |

---

## 4. Frontend Web Tech Stack (`smilefix-app`)

| Concern | Library |
|---------|---------|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Routing | React Router DOM v7 |
| State | Zustand v5 |
| Server state | TanStack Query v5 |
| Styling | Tailwind CSS v4 |
| Icons | lucide-react |
| Charts | Recharts v3 |
| Animations | Framer Motion v12 |
| i18n | i18next + react-i18next (AR + EN) |

---

## 5. Mobile App Tech Stack (`smilefix-patient-app`)

| Concern | Library |
|---------|---------|
| Framework | React Native 0.81.5 + Expo 54 |
| Navigation | React Navigation v7 (native-stack + bottom-tabs) |
| State | Zustand v5 |
| Secure storage | expo-secure-store |
| Auth | JWT (same backend) |
| Biometrics | expo-local-authentication |
| i18n | i18next + expo-localization |
| QR codes | react-native-qrcode-svg |
| Fonts | Manrope + Inter (expo-google-fonts) |
| Gestures | react-native-gesture-handler |

---

## 6. Database Schema (PostgreSQL)

### Enums
```sql
"Role"             : ADMIN | DENTIST | RECEPTIONIST | ACCOUNTANT | STOREKEEPER | HR | PATIENT
"AppointmentStatus": SCHEDULED | CONFIRMED | IN_PROGRESS | COMPLETED | CANCELLED | NO_SHOW
"AuditAction"      : CREATE | UPDATE | DELETE | LOGIN | LOGOUT | LOGIN_FAILED | PERMISSION_DENIED
"TreatmentStatus"  : DRAFT | ACTIVE | COMPLETED | CANCELLED
"ProcedureStatus"  : PENDING | DONE | SKIPPED
"ToothStatus"      : HEALTHY | DECAYED | FILLED | MISSING | CROWNED | IMPLANT | BRIDGE
"InvoiceStatus"    : DRAFT | ISSUED | PARTIALLY_PAID | PAID | OVERDUE | CANCELLED
"PaymentMethod"    : CASH | CARD | BANK_TRANSFER | INSURANCE
"ImageType"        : XRAY | PHOTO | SCAN | DOCUMENT
"InventoryCategory": Consumables | Instruments | Medications | Protective Equipment |
                     Impression Materials | Restorative | Sterilization | Equipment
"StaffRole"        : doctor | receptionist | nurse | hygienist | assistant | admin | manager
"StaffStatus"      : active | inactive | on-leave
"AttendanceStatus" : present | absent | late | half-day | leave
"ReportType"       : FINANCIAL | INVENTORY | PAYROLL | APPOINTMENTS | PATIENTS
```

### Tables

#### `users`
```
id (uuid PK), username (unique), email (unique), password_hash,
role ("Role"), is_active, failed_login_count, locked_until,
last_login_at, created_at, updated_at
```

#### `patients`
```
id (uuid PK), patient_code (unique, auto SF-XXXXX), first_name, last_name,
date_of_birth, gender, national_id (unique), phone, email,
address, blood_type, allergies (text[]), medical_history,
emergency_contact_name, emergency_contact_phone,
status ('active'|'inactive'|'pending'),
deleted_at (soft delete), created_at, updated_at
```

#### `appointments`
```
id (uuid PK), patient_id (FK→patients), dentist_id (FK→users),
scheduled_at, duration_minutes, status ("AppointmentStatus"),
chair_number, treatment_name, notes, created_at, updated_at
```

#### `refresh_tokens`
```
id, user_id (FK→users), token_hash (unique), expires_at, revoked_at, created_at
```

#### `audit_logs`
```
id, user_id (FK→users nullable), action ("AuditAction"), resource,
resource_id, previous_value (jsonb), new_value (jsonb),
ip_address, user_agent, created_at
```

#### `procedure_catalog`
```
id, code (unique), name, description, default_cost, category,
is_active, created_at, updated_at
```

#### `treatment_plans`
```
id, patient_id (FK), dentist_id (FK), appointment_id (FK nullable),
title, description, status ("TreatmentStatus"), estimated_cost,
created_at, updated_at
```

#### `treatment_procedures`
```
id, treatment_plan_id (FK), procedure_id (FK), tooth_number,
quantity, unit_cost, status ("ProcedureStatus"), notes,
performed_at, performed_by (FK→users), created_at, updated_at
```

#### `odontogram`
```
id, patient_id (FK unique), teeth (jsonb), last_updated_by (FK→users),
created_at, updated_at
```

#### `odontogram_history`
```
id, patient_id (FK), tooth_number, previous_state (jsonb), new_state (jsonb),
changed_by (FK→users), treatment_plan_id (FK nullable), created_at
```

#### `medical_images`  (patient file attachments)
```
id, patient_id (FK), treatment_plan_id (FK nullable),
appointment_id (FK nullable), tooth_number, type ("ImageType"),
file_name, storage_key (local path), mime_type, file_size_bytes,
uploaded_by (FK→users), notes, created_at
```

#### `invoices`
```
id, invoice_number (auto INV-YYYY-NNNNNN on ISSUED), patient_id (FK),
appointment_id (FK nullable), treatment_plan_id (FK nullable),
line_items (jsonb array), subtotal, tax_rate, tax_amount, total_amount,
amount_paid, status ("InvoiceStatus"), due_date, issued_at,
issued_by (FK→users), notes, created_at, updated_at
```

#### `payments`
```
id, invoice_id (FK), amount, method ("PaymentMethod"), reference,
notes, paid_at, recorded_by (FK→users), created_at
```

#### `payment_refunds`
```
id, payment_id (FK), invoice_id (FK), amount, reason,
refunded_by (FK→users), refunded_at, created_at
```

#### `inventory`
```
id, material_name, category ("InventoryCategory"), quantity, unit,
min_stock_alert, expiry_date, unit_price, supplier_info,
deleted_at, created_at, updated_at
```

#### `staff`
```
id, full_name, role ("StaffRole"), phone, email (unique),
shift_start, shift_end, base_salary, status ("StaffStatus"),
deleted_at, created_at, updated_at
```

#### `attendance_logs`
```
id, staff_id (FK→staff), log_date, check_in, check_out,
status ("AttendanceStatus"), notes, created_at, updated_at
UNIQUE(staff_id, log_date)
```

#### `salary_records`
```
id, staff_id (FK→staff), month (1-12), year, base_salary,
bonus, deductions, net_salary, notes, created_at, updated_at
UNIQUE(staff_id, month, year)
```

#### `report_snapshots`
```
id, report_type ("ReportType"), params (jsonb), data (jsonb),
generated_by (FK→users nullable), expires_at, created_at
```

#### `notifications`
```
id, user_id (FK→users nullable), type, severity,
title, message, action_label, action_route, metadata (jsonb),
is_read, created_at, updated_at
```

#### `patient_notes`
```
id, patient_id (FK→patients), author_id (FK→users), content,
created_at, updated_at
```

#### `notification_preferences`  (added in migration 20260605100000)
```
user preferences for notification types (jsonb or columns)
```

### Key DB Triggers / Sequences
- `set_updated_at()` — PL/pgSQL function, applied to most tables via `BEFORE UPDATE` triggers
- `assign_invoice_number()` — sets `invoice_number` = `INV-YYYY-NNNNNN` when status goes DRAFT→ISSUED
- `invoice_number_seq` — sequential counter for invoice numbers
- `patient_code_seq` — sequential counter for `SF-XXXXX` patient codes

---

## 7. API Routes Reference

Base URL: `http://localhost:3000/api/v1`

All protected routes require: `Authorization: Bearer <accessToken>`

### Auth  `/api/v1/auth`
| Method | Path | Auth | Permission | Description |
|--------|------|------|------------|-------------|
| POST | `/register` | ✗ | — | Register new user |
| POST | `/login` | ✗ | — | Login → returns accessToken + refreshToken |
| POST | `/refresh` | ✗ | — | Refresh access token |
| POST | `/logout` | ✓ | any | Logout (revokes token) |
| GET | `/users?role=DENTIST` | ✓ | appointments:read | List users, filter by role |

### Patients  `/api/v1/patients`
| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/me` | any auth | Patient's own record (mobile app) |
| POST | `/` | patients:* | Create patient |
| GET | `/` | patients:read | List patients (search, pagination) |
| GET | `/:id` | patients:read | Get patient by ID |
| PUT | `/:id` | patients:* | Update patient |
| DELETE | `/:id` | patients:* | Soft delete patient |
| GET | `/:id/attachments` | patients:read | List attachments |
| POST | `/:id/attachments` | patients:* | Upload file (multipart) |
| GET | `/:id/attachments/:attachmentId/download` | patients:read | Download file |
| DELETE | `/:id/attachments/:attachmentId` | patients:* | Delete attachment |
| GET | `/:patientId/odontogram` | odontogram:read | Get tooth chart |
| POST | `/:patientId/odontogram` | odontogram:create | Init blank chart |
| GET | `/:patientId/odontogram/history` | odontogram:read | Change history |
| PATCH | `/:patientId/odontogram/batch` | odontogram:update | Batch update teeth |
| PATCH | `/:patientId/odontogram/:toothNumber` | odontogram:update | Update single tooth |
| GET | `/:patientId/notes` | patients:read | List clinical notes |
| POST | `/:patientId/notes` | patients:* | Add clinical note |
| DELETE | `/:patientId/notes/:noteId` | patients:* | Delete note |
| GET | `/:patientId/debt` | invoices:read | Total unpaid debt |
| GET | `/:patientId/invoices` | invoices:read | Patient invoice list |

### Appointments  `/api/v1/appointments`
| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | `/` | any auth | Book appointment |
| GET | `/` | any auth | List appointments |
| GET | `/:id` | any auth | Get appointment |
| PATCH | `/:id` | appointments:read + ownership | Update appointment |
| DELETE | `/:id` | appointments:* | Delete appointment |

### Treatments  `/api/v1/treatments`
| Method | Path | Permission |
|--------|------|------------|
| GET | `/` | treatments:read |
| GET | `/:id` | treatments:read |
| POST | `/` | treatments:* |
| PATCH | `/:id` | treatments:* |
| PATCH | `/:id/procedures/:procedureId` | treatments:* |

### Procedures (catalog)  `/api/v1/procedures`
| Method | Path | Permission |
|--------|------|------------|
| GET | `/` | invoices:read |
| GET | `/:id` | invoices:read |
| POST | `/` | invoices:* |
| PATCH | `/:id` | invoices:* |
| DELETE | `/:id` | invoices:* |

### Invoices  `/api/v1/invoices`
| Method | Path | Permission |
|--------|------|------------|
| GET | `/` | invoices:read |
| GET | `/:id` | invoices:read |
| POST | `/` | invoices:* |
| PATCH | `/:id` | invoices:* |
| GET | `/:id/payments` | invoices:read |
| POST | `/:id/payments` | payments:* |
| POST | `/:id/payments/:paymentId/refund` | payments:* |

### Finance  `/api/v1/finance`
| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/summary?from=&to=` | finance:* | KPI cards + chart + recent invoices + debts |

### Reports  `/api/v1/reports`
| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/financial` | finance:* | Financial report |
| GET | `/financial/export?format=pdf\|excel` | finance:* | Export |
| GET | `/inventory` | inventory:read | Inventory report |
| GET | `/inventory/export` | inventory:read | Export |
| GET | `/payroll` | staff:* | Payroll report |
| GET | `/payroll/export` | staff:* | Export |
| GET | `/audit-logs` | * (ADMIN only) | Audit trail |

### Dashboard  `/api/v1/dashboard`
| Method | Path | Permission |
|--------|------|------------|
| GET | `/stats` | dashboard:read |
| GET | `/recent-patients` | dashboard:read |
| GET | `/today-schedule` | dashboard:read |

### Inventory  `/api/v1/inventory`
| Method | Path | Permission |
|--------|------|------------|
| GET | `/` | inventory:read |
| GET | `/alerts` | inventory:read |
| GET | `/:id` | inventory:read |
| POST | `/` | inventory:* |
| PUT | `/:id` | inventory:* |
| POST | `/:id/restock` | inventory:* |
| DELETE | `/:id` | inventory:* |

### Staff  `/api/v1/staff`
| Method | Path | Permission |
|--------|------|------------|
| GET | `/attendance` | staff:read |
| POST | `/attendance` | staff:* |
| PUT | `/attendance/:id` | staff:* |
| DELETE | `/attendance/:id` | staff:* |
| GET | `/salary` | staff:read |
| POST | `/salary` | staff:* |
| PUT | `/salary/:id` | staff:* |
| DELETE | `/salary/:id` | staff:* |
| GET | `/salary/summary/:year/:month` | staff:read |
| GET | `/dashboard-stats` | staff:read |
| GET | `/` | staff:read |
| GET | `/:id` | staff:read |
| POST | `/` | staff:* |
| PUT | `/:id` | staff:* |
| DELETE | `/:id` | staff:* |

### Notifications  `/api/v1/notifications`
| Method | Path | Permission |
|--------|------|------------|
| GET | `/` | any auth |
| GET | `/unread-count` | any auth |
| GET | `/preferences` | any auth |
| PUT | `/preferences` | any auth |
| POST | `/` | notifications:write |
| PATCH | `/read-all` | any auth |
| PATCH | `/:id/read` | any auth |
| DELETE | `/:id` | any auth |

---

## 8. RBAC — Roles & Permissions

```javascript
ADMIN:        ['*']   // full access to everything
DENTIST:      ['dashboard:read','patients:read','appointments:read',
               'appointments:update','treatments:*','odontogram:*','invoices:read','staff:read']
RECEPTIONIST: ['dashboard:read','patients:*','appointments:*','treatments:*',
               'invoices:*','payments:*','inventory:read',
               'odontogram:read','odontogram:create','odontogram:update','staff:*']
ACCOUNTANT:   ['invoices:*','payments:*','finance:*','reports:financial','staff:read']
STOREKEEPER:  ['inventory:*','reports:inventory']
HR:           ['staff:*','reports:payroll']
PATIENT:      ['appointments:read','appointments:create','invoices:read']
```

Permission resolution order: role permissions + any extra `user.permissions` from JWT → wildcard `*` matches all → `resource:*` matches all actions on that resource.

---

## 9. Authentication Flow

1. `POST /auth/login` → returns `{ accessToken, refreshToken }`
2. Access token: RS256 JWT, payload `{ sub, role, permissions, jti }`, expires in 15m
3. Refresh token: hashed and stored in `refresh_tokens` table, expires in 7d
4. `POST /auth/refresh` → new access + refresh token pair (rotation)
5. `POST /auth/logout` → adds access token `jti` to in-memory deny-list
6. Web app: tokens stored in localStorage, rehydrated on boot via `authStore.rehydrate()`
7. Mobile app: tokens stored in `expo-secure-store`, rehydrated via `appStore.hydrateFromStorage()`

---

## 10. Web Admin Pages & Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | DashboardPage | KPI cards, charts, recent patients, today's schedule |
| `/patients` | PatientsPage | Patient list with search + filters |
| `/patients/new` | AddPatientPage | Create patient form |
| `/patients/:id` | PatientDetailPage | Profile, history, attachments, notes, debt |
| `/patients/:id/edit` | EditPatientPage | Edit patient form |
| `/patients/:id/odontogram` | OdontogramPage | Interactive tooth chart |
| `/calendar` | CalendarPage | Appointment calendar view |
| `/treatments` | TreatmentsPage | Treatment plans |
| `/finance` | FinancePage | Invoices, payments, finance summary |
| `/inventory` | InventoryPage | Stock management |
| `/staff` | StaffPage | Staff, attendance, salary |
| `/reports` | ReportsPage | Financial / inventory / payroll / audit reports |
| `/notifications` | NotificationsPage | In-app notifications |
| `/settings` | SettingsPage | App settings |
| `/login` | LoginPage | Auth |
| `/forgot-password` | ForgotPasswordPage | Password reset |

---

## 11. Mobile App Screens

| Screen | Description |
|--------|-------------|
| WelcomeScreen | Splash / onboarding |
| LoginScreen | Patient login (email/password) |
| RegisterScreen | Patient self-registration |
| OTPVerifyScreen | OTP verification |
| HomeScreen | Patient home dashboard |
| AppointmentsScreen | View upcoming & past appointments |
| BookingScreen | Book a new appointment |
| ProfileScreen | Patient profile |
| QRScreen | Patient QR code for clinic check-in |

Navigation stack: `react-navigation` native-stack (auth flow) + bottom tabs (main app).

---

## 12. Frontend Services (API Layer)

Each file in `smilefix-app/src/services/` wraps fetch/axios calls:

| File | Covers |
|------|--------|
| `apiClient.ts` | Base axios instance, token injection, auto-refresh on 401, fires `auth:session-expired` event |
| `authService.ts` | login, logout, refresh, token/user storage helpers |
| `patientService.ts` | patients CRUD |
| `appointmentService.ts` | appointments CRUD |
| `invoiceService.ts` | invoices, payments, refunds |
| `odontogramService.ts` | odontogram read/update/batch/history |
| `treatmentService.ts` (procedures) | treatment plans + procedure catalog |
| `inventoryService.ts` | inventory CRUD + restock |
| `staffService.ts` | staff + attendance + salary |
| `reportService.ts` | financial/inventory/payroll reports + audit logs |
| `dashboardService.ts` | dashboard stats + recent patients + schedule |
| `notificationService.ts` | notifications CRUD + preferences |
| `attachmentService.ts` | file upload/download/delete |
| `noteService.ts` | patient clinical notes |

---

## 13. State Management (Web)

Zustand stores in `smilefix-app/src/store/`:

| Store | State |
|-------|-------|
| `authStore` | user, isAuthenticated, logout, rehydrate |
| `financeStore` | invoice filters, selected invoice state |

TanStack Query is used for all server-fetched data (cache, refetch, pagination).

---

## 14. Environment Variables

### Backend (`.env`)
```env
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@localhost:5432/smilefix
JWT_PRIVATE_KEY=<RS256 private key>
JWT_PUBLIC_KEY=<RS256 public key>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
BCRYPT_ROUNDS=12
PORT=3000
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
RATE_LIMIT_MAX=100
UPLOAD_DIR=uploads

# License System Configuration
HARDWARE_SALT=your-secure-salt-string-here
MASTER_LICENSE_SERVER_URL=https://license.smilefix.com/api/validate
LICENSE_GRACE_PERIOD_DAYS=7
LICENSE_BACKGROUND_CHECK_INTERVAL=86400
DEVELOPER_MASTER_KEY=optional-developer-master-key
```

---

## 15. Development Setup

### Backend
```bash
cd dental-clinic-backend
npm install
# create .env with DATABASE_URL, JWT keys, and HARDWARE_SALT
npm run db:migrate          # run all migrations (including license tables)
node scripts/seed.mjs       # seed test users and license records
npm run dev                 # starts with --watch on port 3000

# Test license system
npm run license:generate-hardware-key
```

### Seed Credentials
| Email | Password | Role |
|-------|----------|------|
| admin@smilefix.com | Admin@1234 | ADMIN |
| dr.smith@smilefix.com | Doctor@1234 | DENTIST |
| dr.jones@smilefix.com | Dentist@5678 | DENTIST |

### License Test Commands
```bash
# Generate hardware-bound license key for current machine
npm run license:generate-hardware-key

# Generate for specific machine ID (for client support)
npm run license:generate-hardware-key -- --id=CLIENT_MACHINE_ID

# Check license status
curl http://localhost:3000/api/v1/license/status
```

### Web Admin
```bash
cd smilefix-app
npm install
npm run dev     # Vite dev server on http://localhost:5173
```

### Mobile App
```bash
cd smailfixmobail/smilefix-patient-app
npm install
npx expo start  # scan QR with Expo Go or use emulator
```

---

## 16. Key Architectural Decisions

1. **Module pattern** — each backend feature is a folder with `controller / service / repository / routes / schema`. Controllers handle HTTP, services hold business logic, repositories handle DB queries.

2. **Soft deletes** — patients and inventory use `deleted_at` timestamp. Hard deletes only on attachments and cascade-able child records.

3. **Audit logging** — global `onSend` hook in `auditHook.js` captures all mutating requests and writes to `audit_logs`.

4. **Invoice numbering** — a PostgreSQL trigger auto-assigns `INV-YYYY-NNNNNN` when status transitions `DRAFT → ISSUED`. Same pattern used for patient codes (`SF-XXXXX`).

5. **Odontogram** — stored as a single JSONB `teeth` map per patient. Every tooth update also writes a row to `odontogram_history` for full audit trail.

6. **CORS** — in development allows any `localhost`, LAN IP, and React Native requests (no Origin header). In production lock to specific domains via `CORS_ORIGIN` env var.

7. **JWT strategy** — RS256 asymmetric keys. Short-lived access tokens (15m) + rotating refresh tokens. Logout uses an in-memory JTI deny-list (pruned on each check).

8. **File storage** — local filesystem under `uploads/` directory, served via `@fastify/static` at `/uploads/`. Replace `storage_key` handling for S3 in production.

9. **i18n** — both web and mobile support Arabic + English. Language persisted to localStorage (web) / AsyncStorage (mobile). RTL layout handled via i18n direction detection.

10. **Report exports** — reports can be exported as PDF (pdfkit) or Excel (exceljs) via `/export` sub-routes. Heavy report data is cached in `report_snapshots` table with TTL.

11. **Hardware-bound licensing** — Comprehensive protection system using hardware fingerprinting with `node-machine-id`. License keys bound to specific computer hardware, preventing unauthorized copying. Self-protecting system with automatic lockout on hardware mismatch detection.

12. **Offline-first activation** — License activation designed for offline sales scenarios with simple copy-paste workflow. No internet required for licensing validation after initial activation.

---

## 17. Current State & Known Gaps

- `/roles` endpoints return 501 (Phase 2 — dynamic RBAC not yet implemented)
- Password reset (`/forgot-password` page) — UI exists, backend endpoint may be a stub
- Push notifications — schema exists, backend generates in-app notifications; no WebSocket/push yet
- Mobile app `OTPVerifyScreen` — flow exists in UI, backend OTP endpoint status unclear
- `smailfixmobail/stitch_smilefix_patient_app_ui/` — appears to be a UI prototype/archive (zip files)

---

## 18. Hardware-Bound License System

### Overview
A comprehensive license protection system that binds software activation to specific computer hardware, preventing unauthorized copying and distribution.

### Key Features
- **Hardware fingerprinting**: Unique identification of each computer using machine IDs, CPU info, RAM, hostname
- **Offline activation**: No internet connection required for licensing
- **Automatic copy protection**: Software automatically locks if copied to another computer
- **Professional UX**: Simple copy-paste activation workflow for clients
- **Developer tools**: Command-line tools for license generation and management

### Technical Implementation

#### Backend Components
- `src/modules/license/` - License management module
- `src/utils/hardwareId.js` - Hardware fingerprint generation service
- `scripts/generate-hardware-key.mjs` - License key generator
- `src/middleware/licenseGuard.js` - Global license protection middleware

#### Database Schema Updates
```sql
-- Added to license_info table:
hardware_fingerprint TEXT      -- SHA256 hardware fingerprint
hardware_machine_id TEXT       -- Machine ID from node-machine-id
is_hardware_bound BOOLEAN      -- Whether license is hardware-bound
hardware_info JSONB            -- Hardware information storage
```

#### API Endpoints
```
GET    /api/v1/license/device-id       # Get hardware activation request code
POST   /api/v1/license/activate        # Activate with hardware-bound key
GET    /api/v1/license/status          # Check license status
GET    /api/v1/license/health          # System health check
```

#### Frontend Activation Flow
1. Client installs software → sees "Activation Request Code"
2. Copies code → sends to support team
3. Support generates hardware-bound license key using client's machine ID
4. Client enters key → software activated permanently
5. If copied to another computer → automatic lockout with security alert

### New Dependencies
- `node-machine-id`: For generating unique machine identifiers
- Enhanced security with hardware-based cryptographic protection

### Development Commands
```bash
# Generate hardware-bound license key for current machine
npm run license:generate-hardware-key

# Generate key for specific client machine
npm run license:generate-hardware-key -- --id=CLIENT_MACHINE_ID

# Generate from hardware fingerprint
npm run license:generate-hardware-key -- --fingerprint=HARDWARE_FINGERPRINT
```

### Security Features
- **Self-protecting**: Automatically detects hardware mismatches
- **Session destruction**: Invalidates all tokens on license revocation
- **Periodic checks**: License verified every 5 minutes during operation
- **Route protection**: All dashboard routes require valid license
- **Global guard**: License check on initial app load in App.tsx

### Environment Variables
```env
# License system configuration
HARDWARE_SALT=your-secure-salt-string-here           # Secret salt for hardware hashing
MASTER_LICENSE_SERVER_URL=https://license.smilefix.com/api/validate  # Optional cloud validation
LICENSE_GRACE_PERIOD_DAYS=7                         # Grace period for license checks
LICENSE_BACKGROUND_CHECK_INTERVAL=86400             # Background check interval in seconds
```

### Documentation Files
- `HARDWARE_BOUND_LICENSE.md` - Complete system documentation
- `LICENSE_SYSTEM.md` - Original license system documentation
- `FINAL_IMPLEMENTATION_SUMMARY.md` - Implementation completion report
- `IMPLEMENTATION_SUMMARY.md` - Technical implementation details

---

## 19. Development Setup Updates

### Backend with License System
```bash
cd dental-clinic-backend
npm install
# Create .env with HARDWARE_SALT and other license variables
npm run db:migrate          # Run all migrations including license tables
node scripts/seed.mjs       # Seed test users and license records
npm run dev                 # Starts with --watch on port 3000

# Test license system
npm run license:generate-hardware-key
```

### License Activation Workflow
1. **For Clients**: Install → Copy Activation Request Code → Send to support → Enter license key
2. **For Support**: Receive machine ID → Generate key → Send to client
3. **Security**: If copied to another PC → Automatic lockout with "SECURITY ALERT"
