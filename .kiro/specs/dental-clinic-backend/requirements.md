# Requirements Document

## Introduction

The Integrated Dental Clinic Management System (IDCMS) is a comprehensive backend API built with Node.js, Fastify v5, TypeScript, Prisma v7, and PostgreSQL. It serves as the single source of truth for all clinic operations, exposing RESTful endpoints consumed by the SmileFix frontend application. The system covers ten functional domains: Authentication & Authorization, Patient Management, Appointment Management, Treatment Management, Financial Management, Inventory Management, Staff Management, Reports & Analytics, Audit Logging, and system-wide Scalability concerns. Development is organized into five sequential phases, each delivering a vertical slice of production-ready functionality.

---

## Glossary

- **System**: The IDCMS backend API as a whole.
- **API**: The RESTful HTTP interface exposed by the System.
- **Auth_Service**: The module responsible for authentication and JWT lifecycle.
- **RBAC_Engine**: The module that evaluates role and permission checks on every request.
- **User**: Any authenticated human principal interacting with the System (Admin, Dentist, Receptionist, or Patient).
- **Admin**: A User with full system-wide privileges.
- **Dentist**: A User who provides clinical services and owns treatment records.
- **Receptionist**: A User who manages appointments, patients, and front-desk operations.
- **Patient**: A User who is also a clinic patient and can view their own records.
- **JWT**: JSON Web Token used as the bearer credential for authenticated requests.
- **Access_Token**: A short-lived JWT (15 minutes) used to authorize API calls.
- **Refresh_Token**: A long-lived opaque token (7 days) used to obtain new Access_Tokens.
- **Permission**: A fine-grained action string in the format `resource:action` (e.g., `patients:read`).
- **Role**: A named collection of Permissions assigned to a User.
- **Patient_Record**: The aggregate of demographic, medical history, and contact data for a Patient.
- **Appointment**: A scheduled time slot linking a Patient to a Dentist for a clinical visit.
- **Treatment_Plan**: An ordered set of dental procedures prescribed for a Patient.
- **Odontogram**: A graphical tooth-by-tooth chart recording the clinical status of each tooth.
- **Invoice**: A financial document itemizing charges for services rendered to a Patient.
- **Payment**: A recorded monetary transaction settling part or all of an Invoice.
- **Inventory_Item**: A dental supply or consumable tracked by the System.
- **Supplier**: An external vendor from whom Inventory_Items are procured.
- **Restock_Order**: A purchase order sent to a Supplier to replenish Inventory_Items.
- **Employee**: A staff member (Dentist, Receptionist, or other role) whose HR data is managed by the System.
- **Shift**: A scheduled work period assigned to an Employee.
- **Audit_Log**: An immutable record of a significant action performed within the System.
- **Report**: An aggregated, queryable data export covering a defined time range and domain.
- **Validator**: The input validation layer applied to all incoming request payloads.
- **Rate_Limiter**: The middleware that enforces per-IP and per-User request quotas.
- **Migration**: A versioned, incremental change to the PostgreSQL database schema managed by Prisma.

---

## Requirements

### Requirement 1: Phased Development Roadmap

**User Story:** As an Admin, I want the system to be delivered in clearly defined phases, so that each phase produces a deployable, testable increment of functionality.

#### Acceptance Criteria

1. THE System SHALL be delivered across five sequential phases: Phase 1 (Auth + Core Schema), Phase 2 (Patient + Appointment Management), Phase 3 (Treatment + Financial Management), Phase 4 (Inventory + Staff Management), Phase 5 (Reports, Analytics, and Audit Log).
2. WHEN a phase is complete, THE System SHALL have all database Migrations for that phase applied and all API endpoints for that phase returning correct responses.
3. THE System SHALL maintain backward compatibility within a major API version across all phases.
4. WHEN Phase 1 is complete, THE System SHALL expose a working authentication flow, RBAC_Engine, and the core User, Patient, and Appointment database tables.
5. WHEN Phase 2 is complete, THE System SHALL expose full CRUD endpoints for Patient_Records and Appointments.
6. WHEN Phase 3 is complete, THE System SHALL expose endpoints for Treatment_Plans, Odontogram updates, Invoices, and Payments.
7. WHEN Phase 4 is complete, THE System SHALL expose endpoints for Inventory_Items, Restock_Orders, Suppliers, Employees, Shifts, and attendance tracking.
8. WHEN Phase 5 is complete, THE System SHALL expose Report generation endpoints, analytics aggregations, and the Audit_Log query interface.

---

### Requirement 2: API Design Principles

**User Story:** As a frontend developer, I want a consistent, versioned, and well-documented API, so that I can integrate reliably without surprises.

#### Acceptance Criteria

1. THE API SHALL prefix all routes with `/api/v1/` to support future versioning.
2. THE API SHALL return all responses in JSON format with a consistent envelope: `{ "success": boolean, "data": object | array | null, "error": string | null, "meta": object | null }`.
3. WHEN a request payload fails validation, THE Validator SHALL return HTTP 422 with a structured error body listing each invalid field and its violation message.
4. WHEN an unauthenticated request reaches a protected route, THE API SHALL return HTTP 401.
5. WHEN an authenticated User lacks the required Permission, THE RBAC_Engine SHALL return HTTP 403.
6. WHEN a requested resource does not exist, THE API SHALL return HTTP 404 with a descriptive message.
7. WHEN an unhandled server error occurs, THE API SHALL return HTTP 500 and log the full stack trace without exposing internal details to the caller.
8. THE API SHALL support pagination on all list endpoints via `page` and `limit` query parameters, with defaults of `page=1` and `limit=20`, and a maximum `limit` of 100.
9. THE API SHALL support field-level filtering and sorting on list endpoints via `filter[field]=value` and `sort=field:asc|desc` query parameters where documented.
10. THE API SHALL include a `GET /api/v1/health` endpoint that returns HTTP 200 and system status without requiring authentication.

---

### Requirement 3: Authentication — Registration and Login

**User Story:** As a User, I want to register and log in securely, so that I can access the system with my credentials.

#### Acceptance Criteria

1. WHEN a registration request is received with a unique email, valid password (minimum 8 characters, at least one uppercase letter, one digit, and one special character), and a valid role, THE Auth_Service SHALL create a User record with the password stored as a bcrypt hash (cost factor ≥ 12) and return HTTP 201.
2. IF a registration request contains an email that already exists, THEN THE Auth_Service SHALL return HTTP 409 with the message "Email already registered".
3. WHEN a login request is received with valid credentials, THE Auth_Service SHALL return an Access_Token (JWT, 15-minute expiry) and a Refresh_Token (opaque, 7-day expiry) with HTTP 200.
4. IF a login request contains invalid credentials, THEN THE Auth_Service SHALL return HTTP 401 with the message "Invalid credentials" without revealing which field was incorrect.
5. WHEN five consecutive failed login attempts occur for the same email within 10 minutes, THE Auth_Service SHALL lock the account for 15 minutes and return HTTP 429.
6. THE Auth_Service SHALL sign all JWTs using RS256 with a private key loaded from an environment variable.
7. THE Auth_Service SHALL include the following claims in every Access_Token: `sub` (User ID), `role`, `permissions` (array), `iat`, `exp`.

---

### Requirement 4: Authentication — Token Lifecycle

**User Story:** As a User, I want my session to remain active without re-entering credentials, so that I have a smooth experience while staying secure.

#### Acceptance Criteria

1. WHEN a valid Refresh_Token is submitted to `POST /api/v1/auth/refresh`, THE Auth_Service SHALL issue a new Access_Token and rotate the Refresh_Token, invalidating the previous one.
2. IF an expired or revoked Refresh_Token is submitted, THEN THE Auth_Service SHALL return HTTP 401 and clear the associated session.
3. WHEN a logout request is received with a valid Access_Token, THE Auth_Service SHALL revoke the associated Refresh_Token and add the Access_Token's `jti` claim to a deny-list until its natural expiry.
4. THE Auth_Service SHALL store Refresh_Tokens as hashed values in the database, never in plaintext.
5. WHEN a User's password is changed, THE Auth_Service SHALL invalidate all active Refresh_Tokens for that User.

---

### Requirement 5: Role-Based Access Control (RBAC)

**User Story:** As an Admin, I want fine-grained permission control per role, so that each staff member can only access what their role requires.

#### Acceptance Criteria

1. THE RBAC_Engine SHALL enforce the following default role-to-permission mappings:
   - Admin: all permissions across all resources.
   - Dentist: `patients:read`, `appointments:read`, `appointments:update`, `treatments:*`, `odontogram:*`, `invoices:read`.
   - Receptionist: `patients:*`, `appointments:*`, `invoices:*`, `payments:*`, `inventory:read`.
   - Patient: `appointments:read` (own only), `treatments:read` (own only), `invoices:read` (own only).
2. WHEN a request arrives at a protected endpoint, THE RBAC_Engine SHALL verify the Access_Token signature, check the `exp` claim, and evaluate the required Permission before allowing the request to proceed.
3. THE RBAC_Engine SHALL support resource-level ownership checks so that a Patient User can only access records where `patientId` matches their own `sub` claim.
4. WHERE an Admin configures a custom role, THE RBAC_Engine SHALL persist the role and its permissions in the database and apply them on subsequent requests without requiring a server restart.
5. THE System SHALL expose `GET /api/v1/roles` and `PUT /api/v1/roles/:roleId/permissions` endpoints accessible only to Admin Users.

---

### Requirement 6: Patient Management

**User Story:** As a Receptionist or Dentist, I want to create and manage patient records, so that all patient information is centralized and accessible.

#### Acceptance Criteria

1. THE System SHALL store the following fields per Patient_Record: `id`, `firstName`, `lastName`, `dateOfBirth`, `gender`, `nationalId`, `phone`, `email`, `address`, `bloodType`, `allergies` (array), `medicalHistory` (text), `emergencyContactName`, `emergencyContactPhone`, `createdAt`, `updatedAt`.
2. WHEN a new Patient_Record is created, THE Validator SHALL require `firstName`, `lastName`, `dateOfBirth`, `phone`, and `nationalId`, and return HTTP 422 if any are missing.
3. IF a `nationalId` already exists in the database, THEN THE System SHALL return HTTP 409 with the message "Patient with this national ID already exists".
4. WHEN a Patient_Record is updated, THE System SHALL record the previous values in the Audit_Log before applying changes.
5. THE System SHALL support full-text search on `firstName`, `lastName`, `nationalId`, and `phone` via `GET /api/v1/patients?search=<term>`.
6. WHEN a Patient_Record is deleted, THE System SHALL perform a soft delete by setting `deletedAt` and SHALL NOT remove the record from the database.
7. THE System SHALL expose `GET /api/v1/patients/:id/timeline` returning all Appointments, Treatments, Invoices, and Audit_Log entries associated with the Patient, ordered by date descending.

---

### Requirement 7: Appointment Management

**User Story:** As a Receptionist, I want to schedule, reschedule, and cancel appointments, so that the clinic calendar is always accurate.

#### Acceptance Criteria

1. THE System SHALL store the following fields per Appointment: `id`, `patientId`, `dentistId`, `scheduledAt` (timestamp), `durationMinutes`, `status` (enum: `SCHEDULED`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `NO_SHOW`), `notes`, `createdAt`, `updatedAt`.
2. WHEN an Appointment is created, THE Validator SHALL require `patientId`, `dentistId`, `scheduledAt`, and `durationMinutes`.
3. WHEN an Appointment is created, THE System SHALL verify that the Dentist has no overlapping Appointment within the requested time window and return HTTP 409 if a conflict exists.
4. WHEN an Appointment status transitions to `CANCELLED` or `NO_SHOW`, THE System SHALL record the reason and the acting User in the Audit_Log.
5. THE System SHALL expose `GET /api/v1/appointments?dentistId=&date=` returning all Appointments for a given Dentist on a given date, ordered by `scheduledAt` ascending.
6. WHEN an Appointment's `scheduledAt` is within 24 hours of the current time and its status is `SCHEDULED`, THE System SHALL mark it as eligible for automated reminder dispatch (the actual dispatch is handled by an external notification service).
7. THE System SHALL expose `GET /api/v1/appointments/availability?dentistId=&date=` returning available time slots for a Dentist on a given date based on existing Appointments and Shift schedules.

---

### Requirement 8: Treatment Management

**User Story:** As a Dentist, I want to record treatment plans and update the odontogram, so that each patient's clinical history is complete and accurate.

#### Acceptance Criteria

1. THE System SHALL store the following fields per Treatment_Plan: `id`, `patientId`, `dentistId`, `title`, `description`, `status` (enum: `DRAFT`, `ACTIVE`, `COMPLETED`, `CANCELLED`), `procedures` (JSON array of procedure objects), `estimatedCost`, `createdAt`, `updatedAt`.
2. WHEN a Treatment_Plan is created, THE Validator SHALL require `patientId`, `dentistId`, and `title`.
3. THE System SHALL store the Odontogram as a JSON document per Patient containing 32 tooth entries, each with fields: `toothNumber` (1–32), `status` (enum: `HEALTHY`, `DECAYED`, `FILLED`, `MISSING`, `CROWNED`, `IMPLANT`, `BRIDGE`), `notes`, `lastUpdatedAt`.
4. WHEN an Odontogram entry is updated, THE System SHALL append the previous state to an immutable `OdontogramHistory` table before applying the change.
5. THE System SHALL expose `GET /api/v1/patients/:id/odontogram` and `PATCH /api/v1/patients/:id/odontogram/:toothNumber` endpoints.
6. WHEN a Treatment_Plan status transitions to `COMPLETED`, THE System SHALL automatically generate a draft Invoice for the Patient with line items derived from the `procedures` array.
7. THE System SHALL expose `GET /api/v1/treatments?patientId=&status=` for filtered retrieval of Treatment_Plans.

---

### Requirement 9: Financial Management

**User Story:** As a Receptionist or Admin, I want to manage invoices and payments, so that the clinic's revenue is accurately tracked.

#### Acceptance Criteria

1. THE System SHALL store the following fields per Invoice: `id`, `patientId`, `appointmentId` (nullable), `treatmentPlanId` (nullable), `lineItems` (JSON array), `subtotal`, `taxRate`, `taxAmount`, `totalAmount`, `status` (enum: `DRAFT`, `ISSUED`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`, `CANCELLED`), `dueDate`, `issuedAt`, `createdAt`, `updatedAt`.
2. THE System SHALL store the following fields per Payment: `id`, `invoiceId`, `amount`, `method` (enum: `CASH`, `CARD`, `BANK_TRANSFER`, `INSURANCE`), `reference`, `paidAt`, `recordedBy`, `createdAt`.
3. WHEN a Payment is recorded against an Invoice, THE System SHALL recalculate the Invoice's outstanding balance and update its status to `PARTIALLY_PAID` or `PAID` accordingly.
4. WHEN an Invoice's `dueDate` passes and its status is not `PAID` or `CANCELLED`, THE System SHALL update its status to `OVERDUE`.
5. THE System SHALL expose `GET /api/v1/finance/summary?from=&to=` returning total revenue, total outstanding, and payment method breakdown for the specified date range, accessible only to Admin and Receptionist roles.
6. IF a Payment amount exceeds the Invoice's outstanding balance, THEN THE System SHALL return HTTP 422 with the message "Payment amount exceeds outstanding balance".
7. THE System SHALL expose `GET /api/v1/patients/:id/debt` returning the total outstanding balance across all unpaid Invoices for a Patient.

---

### Requirement 10: Inventory Management

**User Story:** As an Admin or Receptionist, I want to track dental supplies and manage restock orders, so that the clinic never runs out of critical materials.

#### Acceptance Criteria

1. THE System SHALL store the following fields per Inventory_Item: `id`, `name`, `category`, `unit`, `quantityOnHand`, `reorderThreshold`, `expiryDate` (nullable), `supplierId`, `unitCost`, `createdAt`, `updatedAt`.
2. WHEN an Inventory_Item's `quantityOnHand` falls at or below `reorderThreshold`, THE System SHALL flag the item as `LOW_STOCK` in its response payload.
3. WHEN an Inventory_Item's `expiryDate` is within 30 days of the current date, THE System SHALL flag the item as `EXPIRING_SOON` in its response payload.
4. THE System SHALL store the following fields per Restock_Order: `id`, `supplierId`, `items` (JSON array of `{ inventoryItemId, quantity, unitCost }`), `status` (enum: `PENDING`, `ORDERED`, `RECEIVED`, `CANCELLED`), `orderedAt`, `receivedAt`, `createdAt`, `updatedAt`.
5. WHEN a Restock_Order status transitions to `RECEIVED`, THE System SHALL increment `quantityOnHand` for each item in the order by the ordered quantity.
6. THE System SHALL expose `GET /api/v1/inventory?status=LOW_STOCK` returning all items currently flagged as low stock.
7. THE System SHALL store Supplier records with fields: `id`, `name`, `contactName`, `phone`, `email`, `address`, `createdAt`, `updatedAt`.

---

### Requirement 11: Staff Management

**User Story:** As an Admin, I want to manage employee records, shifts, and attendance, so that HR operations are handled within the system.

#### Acceptance Criteria

1. THE System SHALL store the following fields per Employee: `id`, `userId`, `employeeCode`, `position`, `department`, `hireDate`, `salary`, `bankAccount`, `status` (enum: `ACTIVE`, `INACTIVE`, `ON_LEAVE`), `createdAt`, `updatedAt`.
2. THE System SHALL store the following fields per Shift: `id`, `employeeId`, `date`, `startTime`, `endTime`, `type` (enum: `MORNING`, `AFTERNOON`, `FULL_DAY`, `ON_CALL`), `createdAt`, `updatedAt`.
3. WHEN a Shift is created for an Employee, THE System SHALL verify that the new Shift does not overlap with an existing Shift for the same Employee on the same date and return HTTP 409 if a conflict exists.
4. THE System SHALL store attendance records with fields: `id`, `employeeId`, `date`, `checkIn`, `checkOut`, `status` (enum: `PRESENT`, `ABSENT`, `LATE`, `HALF_DAY`), `notes`, `createdAt`.
5. THE System SHALL expose `GET /api/v1/staff/:id/attendance?from=&to=` returning attendance records for an Employee within the specified date range.
6. THE System SHALL expose `GET /api/v1/staff/schedule?date=` returning all Shifts for all Employees on a given date.

---

### Requirement 12: Reports and Analytics

**User Story:** As an Admin, I want to generate and export reports, so that I can make data-driven decisions about clinic operations.

#### Acceptance Criteria

1. THE System SHALL expose `GET /api/v1/reports/revenue?from=&to=&groupBy=day|week|month` returning revenue totals grouped by the specified interval.
2. THE System SHALL expose `GET /api/v1/reports/appointments?from=&to=` returning appointment counts grouped by status and by Dentist.
3. THE System SHALL expose `GET /api/v1/reports/patients?from=&to=` returning new patient registrations and returning patient counts for the period.
4. THE System SHALL expose `GET /api/v1/reports/inventory` returning current stock levels, items flagged as LOW_STOCK, and items flagged as EXPIRING_SOON.
5. WHEN a report endpoint is called with `format=csv`, THE System SHALL return the report data as a UTF-8 encoded CSV file with appropriate `Content-Disposition` headers.
6. WHEN a report endpoint is called with `format=json` or no format parameter, THE System SHALL return the report data in the standard JSON envelope.
7. THE System SHALL expose `GET /api/v1/analytics/dashboard` returning a summary object containing: today's appointment count, monthly revenue, active patient count, and low-stock item count, accessible only to Admin and Dentist roles.

---

### Requirement 13: Audit Log System

**User Story:** As an Admin, I want every significant action to be recorded immutably, so that I can trace any change for compliance and security purposes.

#### Acceptance Criteria

1. THE System SHALL record an Audit_Log entry for every CREATE, UPDATE, and DELETE operation on the following entities: User, Patient_Record, Appointment, Treatment_Plan, Odontogram, Invoice, Payment, Inventory_Item, Restock_Order, Employee, Shift.
2. THE System SHALL store the following fields per Audit_Log entry: `id`, `userId` (actor), `action` (enum: `CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `LOGOUT`, `LOGIN_FAILED`, `PERMISSION_DENIED`), `resource` (entity name), `resourceId`, `previousValue` (JSON, nullable), `newValue` (JSON, nullable), `ipAddress`, `userAgent`, `createdAt`.
3. THE Audit_Log table SHALL be append-only; THE System SHALL NOT expose any UPDATE or DELETE endpoint for Audit_Log entries.
4. WHEN a login attempt fails, THE System SHALL record an Audit_Log entry with action `LOGIN_FAILED` and the attempted email as `resourceId`.
5. WHEN a permission check fails, THE System SHALL record an Audit_Log entry with action `PERMISSION_DENIED` including the requested resource and action.
6. THE System SHALL expose `GET /api/v1/audit-logs?userId=&resource=&action=&from=&to=` with pagination, accessible only to Admin Users.
7. THE System SHALL retain Audit_Log entries for a minimum of 365 days; entries older than 365 days MAY be archived to cold storage but SHALL NOT be deleted from the queryable interface within that window.

---

### Requirement 14: Database Schema and Migrations

**User Story:** As a developer, I want a well-structured, versioned database schema, so that the data model is consistent, relational, and easy to evolve.

#### Acceptance Criteria

1. THE System SHALL define all database entities as Prisma models in `prisma/schema.prisma` using the `prisma-client` generator with output to `../generated/prisma`.
2. THE System SHALL use UUIDs (cuid or uuid) as primary keys for all tables.
3. THE System SHALL define foreign key relationships with explicit `onDelete` and `onUpdate` behaviors for all relations.
4. THE System SHALL use Prisma Migrations for all schema changes; direct DDL modifications to the database SHALL NOT be permitted.
5. THE System SHALL define database indexes on all foreign key columns and on high-cardinality search fields (`email`, `nationalId`, `phone`, `scheduledAt`, `createdAt`).
6. THE System SHALL use `createdAt` and `updatedAt` timestamp fields on all mutable entities, with `updatedAt` managed via `@updatedAt`.
7. THE System SHALL use PostgreSQL enums (mapped via Prisma `enum`) for all status and type fields.

---

### Requirement 15: Security and Scalability

**User Story:** As an Admin, I want the system to be secure and horizontally scalable, so that it can handle clinic growth without architectural rework.

#### Acceptance Criteria

1. THE System SHALL validate and sanitize all incoming request data using a schema-based Validator (e.g., Zod or Fastify's built-in JSON Schema) before any business logic is executed.
2. THE Rate_Limiter SHALL enforce a maximum of 100 requests per minute per IP address on all public endpoints and 300 requests per minute per authenticated User on protected endpoints.
3. THE System SHALL set the following HTTP security headers on all responses: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security: max-age=31536000; includeSubDomains`.
4. THE System SHALL store all secrets (database URL, JWT private key, etc.) exclusively in environment variables and SHALL NOT commit them to source control.
5. THE System SHALL be stateless with respect to session data; all session state SHALL be encoded in the JWT or stored in the database, enabling horizontal scaling behind a load balancer.
6. THE System SHALL use database connection pooling with a configurable pool size (default: 10 connections) to support concurrent load.
7. WHERE the deployment environment supports it, THE System SHALL expose Prometheus-compatible metrics at `GET /metrics` for request rate, error rate, and response time percentiles.
8. THE System SHALL structure source code using a layered architecture: `routes/` → `controllers/` → `services/` → `repositories/` → Prisma Client, with no layer skipping.
9. THE System SHALL use environment-specific configuration files (`.env.development`, `.env.test`, `.env.production`) and load the appropriate file based on the `NODE_ENV` variable.
