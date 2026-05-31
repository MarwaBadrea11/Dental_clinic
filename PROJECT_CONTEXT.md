# SmileFix Dental Clinic — AI Project Context Document

> **Purpose:** Paste this document into any AI assistant (ChatGPT, Gemini, Claude, etc.) as the first message to give it full context about the project before asking for help.
> **Last updated:** May 31, 2026

---

## 1. Project Overview

**SmileFix** is a full-stack, multi-role dental clinic management system. It is designed to digitize and centralize all clinic operations — from patient registration and appointment scheduling to treatment planning, billing, inventory management, staff/HR, and executive reporting.

**Target audience:** Dental clinic staff across multiple roles — administrators, dentists, receptionists, accountants, storekeepers, and HR managers. Each role sees only the features and data they are authorized to access.

**Core purpose:** Replace paper-based or fragmented clinic workflows with a single, role-aware web application that maintains a full audit trail of every action.

---

## 2. Tech Stack

### Frontend — `smilefix-app/`
| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript 6 |
| Build tool | Vite 8 |
| Routing | React Router DOM v7 (lazy-loaded pages) |
| Client state | Zustand v5 |
| Server state / caching | TanStack React Query v5 |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion v12 |
| Icons | Lucide React |
| Charts | Recharts |
| Internationalization | i18next + react-i18next + browser language detector (Arabic / English) |
| HTTP client | Custom `apiClient.ts` (proactive JWT refresh, deduplication, retry) |

### Backend — `dental-clinic-backend/`
| Layer | Technology |
|---|---|
| Runtime | Node.js (ESM, `"type": "module"`) |
| Framework | Fastify v5 |
| Database | PostgreSQL (via Knex.js v3) |
| Authentication | RS256 JWT (access + refresh tokens), bcrypt v6 |
| Validation | Zod v4 |
| PDF export | pdfkit |
| XLSX export | exceljs |
| Testing | Vitest + fast-check (property-based) |
| Dev server | `node --watch` |

### Fastify Plugins Used
`@fastify/cors`, `@fastify/jwt`, `@fastify/helmet`, `@fastify/rate-limit`, `@fastify/multipart`, `@fastify/static`

### Database
PostgreSQL running locally on port `5432`, database name `dental_clinic`.

---

## 3. Project Architecture

### Folder Structure

```
Dental_clinic/
├── dental-clinic-backend/          Node.js REST API
│   ├── src/
│   │   ├── app.js                  Fastify app factory (registers all plugins + routes)
│   │   ├── server.js               HTTP server entry point
│   │   ├── config/env.js           Typed env variable loader
│   │   ├── db/
│   │   │   ├── db.js               Knex instance
│   │   │   ├── knexfile.js         Knex config
│   │   │   └── migrations/         6 migration files (see §4)
│   │   ├── middleware/
│   │   │   ├── authenticate.js     JWT verification + JTI deny-list
│   │   │   └── authorize.js        Role-based permission check
│   │   ├── plugins/
│   │   │   ├── knex.js             Registers db on fastify.db
│   │   │   ├── jwt.js              RS256 JWT plugin
│   │   │   ├── securityHeaders.js  Helmet plugin
│   │   │   └── auditHook.js        Auto-logs all mutating HTTP requests
│   │   ├── services/
│   │   │   └── audit.service.js    Reusable AuditService (log + query)
│   │   └── modules/                One folder per domain
│   │       ├── auth/               register, login, refresh, logout, changePassword
│   │       ├── patients/           CRUD + soft delete
│   │       ├── appointments/       Book + list
│   │       ├── treatments/         Treatment plans
│   │       ├── procedures/         Procedure catalog
│   │       ├── odontogram/         32-tooth FDI chart + history
│   │       ├── invoices/           Invoices + payments + refunds + finance summary
│   │       ├── inventory/          Stock management + alerts
│   │       ├── staff/              Staff + attendance + salary
│   │       ├── attachments/        File uploads
│   │       ├── dashboard/          Aggregated KPI endpoints
│   │       ├── reports/            Financial / Inventory / Payroll / Audit reports + export
│   │       ├── roles/              Placeholder (501)
│   │       └── health/             Health check
│   ├── scripts/                    DB migration + seed scripts (.mjs)
│   └── package.json
│
└── smilefix-app/                   React frontend
    └── src/
        ├── main.tsx                App entry (QueryClientProvider + i18n init)
        ├── App.tsx                 Auth rehydration + session-expired listener
        ├── routes/AppRouter.tsx    All routes with lazy loading + guards
        ├── pages/                  One file per page (15 pages)
        ├── components/             Organized by domain + shared UI primitives
        ├── store/                  9 Zustand stores
        ├── services/               API service layer (one file per domain)
        ├── hooks/                  React Query hooks (useDashboard, etc.)
        ├── types/index.ts          All TypeScript interfaces and enums
        ├── i18n/                   Translation files (ar, en)
        ├── utils/                  format, cn, date helpers
        ├── constants/routes.ts     Centralized route constants
        └── lib/queryClient.ts      TanStack Query client singleton
```

### Frontend ↔ Backend Interaction

- The frontend runs on `http://localhost:5173` (Vite dev server).
- The backend runs on `http://localhost:3000`.
- All API calls go through `src/services/apiClient.ts`, which:
  - Attaches `Authorization: Bearer <token>` to every request.
  - Proactively refreshes the access token 60 seconds before expiry.
  - Deduplicates concurrent refresh calls (single in-flight promise).
  - On 401, retries once after refreshing; on second failure, fires `auth:session-expired` custom event and clears storage.
- All backend responses follow the envelope: `{ success, data, error, meta }`.
- Frontend service files map backend snake_case shapes to camelCase TypeScript interfaces.

### Backend Module Pattern

Every module follows: `routes.js → controller.js → service.js → repository.js` + `schema.js`

- **Routes**: Registers Fastify routes, applies `authenticate` + `authorize('resource:action')` preHandlers.
- **Controller**: Validates request with Zod schema, calls service, sends `successResponse()` or `errorResponse()`.
- **Service**: Business logic, orchestrates repository calls, throws typed errors (`AppError`, `NotFoundError`, etc.).
- **Repository**: Raw Knex queries only — no business logic.

---

## 4. Database Schema

All tables use UUID primary keys (`gen_random_uuid()`), `created_at` / `updated_at` timestamps, and PostgreSQL-native enums.

### Core Tables (Migration 1)

| Table | Key Columns | Notes |
|---|---|---|
| `users` | id, username, email, password_hash, role, is_active, failed_login_count, locked_until | Role enum: ADMIN, DENTIST, RECEPTIONIST, ACCOUNTANT, STOREKEEPER, HR |
| `patients` | id, first_name, last_name, date_of_birth, gender, national_id (unique), phone, email, blood_type, allergies (text[]), medical_history, emergency_contact_*, deleted_at | Soft delete via `deleted_at` |
| `appointments` | id, patient_id → patients, dentist_id → users, scheduled_at, duration_minutes, status | Status enum: SCHEDULED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW |
| `refresh_tokens` | id, user_id, token_hash (unique), expires_at, revoked_at | Hashed with SHA-256 |
| `audit_logs` | id, user_id, action, resource, resource_id, previous_value (jsonb), new_value (jsonb), ip_address, user_agent | Action enum: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, LOGIN_FAILED, PERMISSION_DENIED |

### Treatments & Financials (Migration 2)

| Table | Key Columns | Notes |
|---|---|---|
| `procedure_catalog` | id, code (unique), name, description, default_cost, category, is_active, duration_minutes, icon, color | Procedure library |
| `treatment_plans` | id, patient_id, dentist_id, appointment_id, title, status, estimated_cost | Status: DRAFT, ACTIVE, COMPLETED, CANCELLED |
| `treatment_procedures` | id, treatment_plan_id, procedure_id, tooth_number, quantity, unit_cost, status, performed_at, performed_by | Status: PENDING, DONE, SKIPPED |
| `odontogram` | id, patient_id (unique), teeth (jsonb), last_updated_by, updated_at | One record per patient; all 32 teeth stored as JSONB blob |
| `odontogram_history` | id, patient_id, tooth_number, previous_state (jsonb), new_state (jsonb), changed_by, treatment_plan_id | Immutable history of every tooth change |
| `medical_images` | id, patient_id, treatment_plan_id, appointment_id, tooth_number, type (ImageType enum), file_name, storage_key, mime_type, uploaded_by | Types: XRAY, PHOTO, SCAN, DOCUMENT |
| `invoices` | id, invoice_number (auto-assigned), patient_id, line_items (jsonb), subtotal, tax_rate, tax_amount, total_amount, amount_paid, status, due_date, issued_at | Status: DRAFT, ISSUED, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED |
| `payments` | id, invoice_id, amount, method (PaymentMethod), reference, paid_at, recorded_by | Methods: CASH, CARD, BANK_TRANSFER, INSURANCE |

### Schema Additions (Migration 3)

| Addition | Detail |
|---|---|
| `invoice_number` on invoices | Auto-assigned via DB trigger when status transitions DRAFT → ISSUED. Format: `INV-YYYY-NNNNNN` using a PostgreSQL sequence. |
| `payment_refunds` table | id, payment_id, invoice_id, amount, reason, refunded_by, refunded_at — tracks partial/full refunds without deleting original payment |
| `created_at` on odontogram | Added retroactively |

### Inventory & Staff (Migration 4)

| Table | Key Columns | Notes |
|---|---|---|
| `inventory` | id, material_name, category (InventoryCategory), quantity, unit, min_stock_alert, expiry_date, unit_price, supplier_info, deleted_at | Categories: Consumables, Instruments, Medications, Protective Equipment, Impression Materials, Restorative, Sterilization, Equipment |
| `staff` | id, full_name, role (StaffRole), phone, email, shift_start, shift_end, base_salary, status, deleted_at | Roles: doctor, receptionist, nurse, hygienist, assistant, admin, manager |
| `attendance_logs` | id, staff_id, log_date, check_in, check_out, status | Unique constraint on (staff_id, log_date) |
| `salary_records` | id, staff_id, month, year, base_salary, bonus, deductions, net_salary | Unique constraint on (staff_id, month, year) |

### Reporting (Migration 5)

| Table | Key Columns | Notes |
|---|---|---|
| `report_snapshots` | id, report_type (ReportType enum), params (jsonb), data (jsonb), generated_by, expires_at | 30-minute TTL cache for heavy report queries |

Additional composite indexes on `audit_logs` for report query performance.

### Key Relationships

```
patients ──< appointments >── users (dentist)
patients ──< treatment_plans >── users (dentist)
treatment_plans ──< treatment_procedures >── procedure_catalog
patients ── odontogram (1:1)
patients ──< odontogram_history
patients ──< medical_images
patients ──< invoices
invoices ──< payments
payments ──< payment_refunds
staff ──< attendance_logs
staff ──< salary_records
users ──< audit_logs
users ──< refresh_tokens
```

---

## 5. Key Features

### Authentication & Security
- RS256 JWT access tokens (8h expiry) + hashed refresh tokens stored in DB (7d expiry).
- Refresh token rotation: every refresh call revokes the old token and issues a new one.
- JTI deny-list (in-memory Map) for immediate token revocation on logout.
- Account lockout: 5 failed login attempts → 15-minute lock.
- Rate limiting: 100 requests/minute per user (or IP if unauthenticated).
- Helmet security headers on all responses.

### Role-Based Access Control
Six roles with granular permission strings (`resource:action`):
- **ADMIN**: Full access (`*`)
- **DENTIST**: Patient read, appointment management, full treatment + odontogram access, invoice read
- **RECEPTIONIST**: Patient + appointment + invoice + payment full access, inventory read, odontogram create/read
- **ACCOUNTANT**: Invoice + payment + finance full access, financial reports, staff read
- **STOREKEEPER**: Inventory full access, inventory reports
- **HR**: Staff full access, payroll reports

### Patient Management
- Full CRUD with soft delete.
- Fields: demographics, blood type, allergies (array), medical history, emergency contact, insurance.
- Search by name, national ID, phone.

### Appointment Scheduling
- Book appointments linked to patient + dentist.
- Status lifecycle: SCHEDULED → CONFIRMED → IN_PROGRESS → COMPLETED (or CANCELLED / NO_SHOW).
- Calendar view (day/week/list) on the frontend.

### Odontogram (Dental Chart)
- Interactive 32-tooth FDI notation chart per patient.
- Tooth conditions: HEALTHY, DECAYED, FILLED, MISSING, CROWNED, IMPLANT, BRIDGE.
- Every tooth update writes an immutable history record before applying the change.
- Frontend maps FDI numbers to visual tooth diagrams with a condition legend.
- "Create chart" initializes an empty record; subsequent updates are upserts.

### Treatment Plans
- Dentist creates a treatment plan linked to a patient and optionally an appointment.
- Plan contains multiple procedures from the catalog, each with tooth number, quantity, unit cost, and status.
- Procedure catalog supports custom duration, icon, and color for UI display.

### Invoicing & Payments
- Invoice lifecycle: DRAFT → ISSUED (triggers auto-numbering) → PARTIALLY_PAID / PAID / OVERDUE / CANCELLED.
- Line items stored as JSONB array; totals calculated server-side.
- `markOverdue()` called on every list request to auto-update stale statuses.
- Payments recorded per invoice; multiple payments supported (partial payments).
- Refunds tracked in `payment_refunds` without modifying original payment records.
- Finance summary endpoint: total revenue, outstanding, breakdown by payment method.

### Inventory Management
- Track dental materials/supplies with category, quantity, unit, reorder level, expiry date, unit price.
- Low-stock and expiry alerts.
- Restock action updates quantity.
- Soft delete.

### Staff & HR
- Staff profiles with role, shift times, base salary.
- Daily attendance logging (check-in/check-out, status).
- Monthly salary records with bonus and deductions.

### Dashboard
- Live KPIs: total patients, patients this month, today's appointments, pending/overdue payments, clinic efficiency (30-day completion rate).
- Recent patients list (LATERAL JOIN — no N+1 queries).
- Today's schedule with treatment descriptions.
- AI image analyzer modal (precision imaging feature).

### Reports
Four live report types with 30-minute server-side snapshot caching:
1. **Financial**: Total invoiced/collected/outstanding, monthly breakdown, payment method breakdown, top 10 procedures by revenue.
2. **Inventory**: Stock summary, per-item stock value, low-stock flagging.
3. **Payroll**: Monthly salary summary per staff member with totals.
4. **Audit Log**: Paginated, filterable log of all system actions.

All three data reports support **PDF export** (pdfkit) and **XLSX export** (exceljs), triggered as browser file downloads.

### Audit Trail
- **Automatic layer**: `auditHook.js` Fastify plugin logs every successful POST/PATCH/PUT/DELETE request via `onResponse` hook — infers action, resource, resourceId, and actor automatically.
- **Manual layer**: `AuditService.log()` called directly in auth flows (login, logout, register, failed login) for richer context including previous/new values.
- Audit logs are queryable with filters: resource, resourceId, userId, action, date range, pagination.

### Internationalization
- Full Arabic and English support via i18next.
- Language persisted to localStorage and applied to the DOM before first render (prevents flash).
- RTL layout support for Arabic.

---

## 6. Workflow Logic

### Authentication Flow
1. User submits email + password to `POST /api/v1/auth/login`.
2. Server verifies password with bcrypt (constant-time comparison even for non-existent users to prevent timing attacks).
3. On success: issues RS256 JWT access token (8h) + random refresh token (SHA-256 hashed before DB storage).
4. Frontend stores both tokens in localStorage; `authStore` sets `isAuthenticated = true`.
5. On app boot, `authStore.rehydrate()` checks if the access token is still valid. If expired, silently calls `POST /auth/refresh` to get a new pair.
6. `apiClient.ts` proactively refreshes the access token 60 seconds before expiry on every API call.
7. On logout: refresh token is revoked in DB; access token JTI is added to the in-memory deny-list.

### Invoice Lifecycle
```
DRAFT
  └─ (update status to ISSUED) ──→ ISSUED  [DB trigger assigns INV-YYYY-NNNNNN]
       ├─ (record partial payment) ──→ PARTIALLY_PAID
       ├─ (record full payment)    ──→ PAID
       ├─ (due_date passes)        ──→ OVERDUE  [auto-marked on list calls]
       └─ (cancel)                 ──→ CANCELLED
```
- PAID and CANCELLED invoices are locked — no further modifications.
- Refunds on payments recalculate `amount_paid` and revert status (PAID → PARTIALLY_PAID or ISSUED).

### Odontogram Update Flow
1. Frontend calls `PATCH /api/v1/patients/:id/odontogram/:toothNumber` with `{ status, notes, surfaces }`.
2. Service validates the FDI tooth number.
3. Reads current tooth state from the JSONB blob.
4. Writes an `odontogram_history` record with previous and new state.
5. Upserts the `odontogram` record with the updated JSONB blob.
6. Returns the updated tooth state.

### Report Generation Flow
1. Frontend calls `GET /api/v1/reports/financial?from=...&to=...`.
2. Service checks `report_snapshots` for a non-expired cached result with matching params.
3. If cache hit: returns cached data immediately.
4. If cache miss: runs the heavy Knex query, stores result in `report_snapshots` with a 30-minute expiry, returns data.
5. For export: fetches (or re-uses cached) data, generates PDF or XLSX buffer, streams as file download.

### Audit Logging Flow
- **Automatic**: After every successful mutating HTTP response, `auditHook.js` fires asynchronously. It parses the URL to extract resource name and UUID, reads `request.user.sub` for the actor, and inserts into `audit_logs`. Errors are swallowed — audit failures never break the main request.
- **Manual**: Auth events (login, logout, failed login, register) call `AuditService.log()` directly with full context.

### Frontend State Management
- **Zustand stores** own all client-side state (patients, invoices, staff, etc.).
- **TanStack React Query** is used specifically for dashboard data (stats, recent patients, today's schedule) to get automatic background refetching and stale-while-revalidate behavior.
- Stores use **optimistic updates** for delete operations (patient, inventory, staff, invoice cancel) — the item is removed from UI immediately, then the API call is made; on failure, the store reloads from the server to revert.

---

## 7. Current Objectives & Known Pain Points

### Known Schema Mismatch (Active Bug)
The `ReportsRepository` (`reports.repository.js`) references tables that **do not exist** in the migrations:
- `inventory_items` and `inventory_categories` — the actual table is `inventory`.
- `payroll_records` and `staff_profiles` — the actual tables are `salary_records` and `staff`.

This means the **Inventory Report** and **Payroll Report** endpoints will throw a PostgreSQL error at runtime when called. The Financial Report and Audit Log endpoints are unaffected.

**Fix needed:** Either rename the tables in the migrations to match the repository queries, or update the repository queries to use the actual table names (`inventory`, `salary_records`, `staff`).

### Environment
- Backend: `http://localhost:3000` (run with `npm run dev` in `dental-clinic-backend/`)
- Frontend: `http://localhost:5173` (run with `npm run dev` in `smilefix-app/`)
- Database: PostgreSQL on `localhost:5432`, database `dental_clinic`
- Migrations: run with `npm run db:migrate` in the backend directory

### API Base URL
The frontend `apiClient.ts` hardcodes `API_BASE = 'http://localhost:3000/api/v1'`. This needs to be moved to an environment variable for production deployment.

### Partially Mocked Data
Some frontend stores still contain mock data that has not been replaced with live API calls:
- `treatmentStore`: `MOCK_PATIENT_TREATMENTS` — patient treatment history is still local mock data; no backend endpoint for patient-level treatment list exists yet.
- `appointmentStore`: Contains mock appointment data alongside real API calls.

### Reports Module — Table Name Mismatch (Detail)
The inventory report query joins `inventory_items as ii` with `inventory_categories as ic`, but the actual table created in migration 4 is `inventory` (with no separate categories table — category is an enum column on the inventory table). The payroll report joins `payroll_records as pr` with `staff_profiles as sp`, but the actual tables are `salary_records` and `staff`.

---

## 8. API Endpoint Reference

All routes are prefixed with `/api/v1`.

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| POST | /auth/register | No | — | Register new user |
| POST | /auth/login | No | — | Login, returns access + refresh tokens |
| POST | /auth/refresh | No | — | Rotate refresh token |
| POST | /auth/logout | Yes | — | Revoke tokens |
| GET | /patients | Yes | patients:read | List patients (paginated, searchable) |
| POST | /patients | Yes | patients:* | Create patient |
| GET | /patients/:id | Yes | patients:read | Get patient by ID |
| PATCH | /patients/:id | Yes | patients:* | Update patient |
| DELETE | /patients/:id | Yes | patients:* | Soft delete patient |
| GET | /patients/:id/odontogram | Yes | odontogram:read | Get full 32-tooth chart |
| POST | /patients/:id/odontogram | Yes | odontogram:create | Initialize chart |
| PATCH | /patients/:id/odontogram/:tooth | Yes | odontogram:* | Update single tooth |
| GET | /patients/:id/odontogram/history | Yes | odontogram:read | Tooth change history |
| GET | /patients/:id/invoices | Yes | invoices:read | Patient's invoices |
| GET | /patients/:id/debt | Yes | invoices:read | Patient's outstanding balance |
| GET | /appointments | Yes | appointments:read | List appointments |
| POST | /appointments | Yes | appointments:* | Book appointment |
| GET | /procedures | Yes | treatments:read | Procedure catalog |
| POST | /procedures | Yes | treatments:* | Create procedure |
| PATCH | /procedures/:id | Yes | treatments:* | Update procedure |
| GET | /treatments | Yes | treatments:read | Treatment plans |
| POST | /treatments | Yes | treatments:* | Create treatment plan |
| GET | /invoices | Yes | invoices:read | List invoices |
| POST | /invoices | Yes | invoices:* | Create invoice |
| PATCH | /invoices/:id | Yes | invoices:* | Update invoice |
| GET | /invoices/:id/payments | Yes | invoices:read | List payments |
| POST | /invoices/:id/payments | Yes | payments:* | Record payment |
| POST | /invoices/:id/payments/:pid/refund | Yes | payments:* | Refund payment |
| GET | /finance/summary | Yes | finance:* | Revenue summary |
| GET | /inventory | Yes | inventory:read | List inventory items |
| POST | /inventory | Yes | inventory:* | Add item |
| PATCH | /inventory/:id | Yes | inventory:* | Update item |
| DELETE | /inventory/:id | Yes | inventory:* | Delete item |
| GET | /staff | Yes | staff:read | List staff |
| POST | /staff | Yes | staff:* | Add staff member |
| GET | /dashboard/stats | Yes | dashboard:read | KPI stats |
| GET | /dashboard/recent-patients | Yes | dashboard:read | Last 10 patients |
| GET | /dashboard/today-schedule | Yes | dashboard:read | Today's appointments |
| GET | /reports/financial | Yes | reports:financial | Financial report |
| GET | /reports/financial/export | Yes | reports:financial | Download PDF/XLSX |
| GET | /reports/inventory | Yes | reports:inventory | Inventory report |
| GET | /reports/inventory/export | Yes | reports:inventory | Download PDF/XLSX |
| GET | /reports/payroll | Yes | reports:payroll | Payroll report (?month=YYYY-MM) |
| GET | /reports/payroll/export | Yes | reports:payroll | Download PDF/XLSX |
| GET | /reports/audit-logs | Yes | * | Paginated audit log |
| GET | /health | No | — | Health check |
