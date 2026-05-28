# Design Document — Integrated Dental Clinic Management System (Phase 1: Foundation)

## Overview

The IDCMS backend is a RESTful API built with **Node.js + Fastify v5**, **TypeScript**, **Prisma v7**, and **PostgreSQL**. Phase 1 delivers the authentication system, RBAC engine, and the core database schema (Users, Patients, Appointments, RefreshTokens, AuditLog) that all subsequent phases build upon.

The API is consumed by the SmileFix frontend and exposes all routes under the `/api/v1/` prefix. Every response follows a consistent JSON envelope:

```json
{ "success": boolean, "data": object | array | null, "error": string | null, "meta": object | null }
```

---

## Architecture

The system follows a strict **layered architecture** with no layer skipping:

```
HTTP Request
     │
     ▼
┌─────────────┐
│   Routes    │  Fastify route definitions, schema validation (Zod), preHandler hooks
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Controllers │  Parse request, call service, format response envelope
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Services   │  Business logic, orchestration, error throwing
└──────┬──────┘
       │
       ▼
┌──────────────┐
│ Repositories │  All Prisma queries, data access only
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Prisma Client│  Generated ORM client → PostgreSQL
└──────────────┘
```

**Rationale for each layer boundary:**
- Routes never call repositories directly — keeps validation and transport concerns separate from data access.
- Controllers never contain business logic — they are thin adapters between HTTP and services.
- Services never import Fastify types — they are framework-agnostic and independently testable.
- Repositories are the only layer that imports `PrismaClient` — centralizes all query logic.

---

## Directory Structure

```
dental-clinic-backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── generated/
│   └── prisma/               # Prisma-generated client
├── src/
│   ├── app.ts                # Fastify instance factory, plugin registration
│   ├── server.ts             # Entry point: starts server
│   ├── config/
│   │   └── env.ts            # Zod-validated environment config
│   ├── plugins/
│   │   ├── prisma.ts         # Prisma client plugin (decorates fastify.prisma)
│   │   ├── jwt.ts            # fastify-jwt plugin setup (RS256)
│   │   ├── cors.ts           # CORS plugin
│   │   ├── rateLimit.ts      # @fastify/rate-limit plugin
│   │   └── securityHeaders.ts# HTTP security headers hook
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.repository.ts
│   │   │   └── auth.schema.ts    # Zod schemas for auth payloads
│   │   ├── roles/
│   │   │   ├── roles.routes.ts
│   │   │   ├── roles.controller.ts
│   │   │   ├── roles.service.ts
│   │   │   └── roles.repository.ts
│   │   └── health/
│   │       └── health.routes.ts
│   ├── middleware/
│   │   ├── authenticate.ts   # Verifies JWT, attaches user to request
│   │   └── authorize.ts      # RBAC preHandler factory
│   ├── utils/
│   │   ├── response.ts       # Response envelope helpers
│   │   ├── errors.ts         # AppError class hierarchy
│   │   ├── password.ts       # bcrypt helpers
│   │   └── token.ts          # JWT sign/verify helpers
│   └── types/
│       ├── fastify.d.ts      # Fastify type augmentations
│       └── index.ts          # Shared domain types
├── prisma.config.ts
├── .env.development
├── .env.test
├── .env.production
├── tsconfig.json
└── package.json
```

---

## Data Models

### Prisma Schema (Phase 1)

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ────────────────────────────────────────────────────────────────────

enum Role {
  ADMIN
  DENTIST
  RECEPTIONIST
  ACCOUNTANT
  STOREKEEPER
  HR
}

enum AppointmentStatus {
  SCHEDULED
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  NO_SHOW
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  LOGIN
  LOGOUT
  LOGIN_FAILED
  PERMISSION_DENIED
}

// ─── User ─────────────────────────────────────────────────────────────────────

model User {
  id                String    @id @default(uuid())
  username          String    @unique
  email             String    @unique
  passwordHash      String
  role              Role      @default(RECEPTIONIST)
  isActive          Boolean   @default(true)
  failedLoginCount  Int       @default(0)
  lockedUntil       DateTime?
  lastLoginAt       DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  appointments  Appointment[]
  refreshTokens RefreshToken[]
  auditLogs     AuditLog[]

  @@index([email])
  @@index([role])
}

// ─── Patient ──────────────────────────────────────────────────────────────────

model Patient {
  id                    String    @id @default(uuid())
  firstName             String
  lastName              String
  dateOfBirth           DateTime
  gender                String
  nationalId            String    @unique
  phone                 String
  email                 String?
  address               String?
  bloodType             String?
  allergies             String[]
  medicalHistory        String?
  emergencyContactName  String?
  emergencyContactPhone String?
  deletedAt             DateTime?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  appointments Appointment[]

  @@index([nationalId])
  @@index([phone])
  @@index([email])
  @@index([firstName, lastName])
  @@index([createdAt])
}

// ─── Appointment ──────────────────────────────────────────────────────────────

model Appointment {
  id              String            @id @default(uuid())
  patientId       String
  dentistId       String
  scheduledAt     DateTime
  durationMinutes Int
  status          AppointmentStatus @default(SCHEDULED)
  notes           String?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  patient Patient @relation(fields: [patientId], references: [id], onDelete: Restrict, onUpdate: Cascade)
  dentist User    @relation(fields: [dentistId], references: [id], onDelete: Restrict, onUpdate: Cascade)

  @@index([patientId])
  @@index([dentistId])
  @@index([scheduledAt])
  // Conflict-prevention: used by overlap query (dentistId + time window)
  @@index([dentistId, scheduledAt])
}

// ─── RefreshToken ─────────────────────────────────────────────────────────────

model RefreshToken {
  id          String    @id @default(uuid())
  userId      String
  tokenHash   String    @unique   // bcrypt hash of the opaque token
  expiresAt   DateTime
  revokedAt   DateTime?
  createdAt   DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade, onUpdate: Cascade)

  @@index([userId])
  @@index([tokenHash])
  @@index([expiresAt])
}

// ─── AuditLog ─────────────────────────────────────────────────────────────────

model AuditLog {
  id            String      @id @default(uuid())
  userId        String?     // null for unauthenticated actions (e.g. LOGIN_FAILED)
  action        AuditAction
  resource      String
  resourceId    String?
  previousValue Json?
  newValue      Json?
  ipAddress     String?
  userAgent     String?
  createdAt     DateTime    @default(now())

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull, onUpdate: Cascade)

  @@index([userId])
  @@index([resource, resourceId])
  @@index([action])
  @@index([createdAt])
}
```

**Key design decisions:**
- `onDelete: Restrict` on Appointment → Patient/User prevents orphaned appointments from accidental deletes.
- `onDelete: Cascade` on RefreshToken → User ensures tokens are cleaned up when a user is removed.
- `onDelete: SetNull` on AuditLog → User preserves audit history even if the actor's account is deleted.
- The `@@index([dentistId, scheduledAt])` composite index is the foundation for the O(log n) overlap query.
- `allergies` is `String[]` (PostgreSQL array) for efficient storage of variable-length lists without a join table.

---

## Components and Interfaces

### Authentication Plugin (`src/plugins/jwt.ts`)

Registers `@fastify/jwt` with RS256 keys loaded from environment variables. Decorates the Fastify instance with `fastify.jwt`.

```typescript
// Key interface
interface JwtPayload {
  sub: string;          // User ID
  role: Role;
  permissions: string[];
  jti: string;          // JWT ID for deny-listing on logout
  iat: number;
  exp: number;
}
```

### Authenticate Middleware (`src/middleware/authenticate.ts`)

A reusable `preHandler` that:
1. Extracts the Bearer token from `Authorization` header.
2. Calls `fastify.jwt.verify(token)` — validates signature and `exp`.
3. Checks the `jti` against the in-memory/Redis deny-list.
4. Attaches the decoded payload to `request.user`.

### Authorize Middleware (`src/middleware/authorize.ts`)

A factory function that returns a `preHandler` for a given permission string:

```typescript
// Usage in routes:
fastify.get('/patients', {
  preHandler: [authenticate, authorize('patients:read')]
}, handler)

// Factory signature:
function authorize(permission: string): preHandler
function authorizeOwner(permission: string, getResourceOwnerId: (req) => string): preHandler
```

The `authorizeOwner` variant additionally checks that the resource's `patientId` matches `request.user.sub` for Patient-role users.

### RBAC Permission Map

```typescript
const ROLE_PERMISSIONS: Record<Role, string[]> = {
  ADMIN: ['*'],  // wildcard — all permissions
  DENTIST: [
    'patients:read', 'appointments:read', 'appointments:update',
    'treatments:*', 'odontogram:*', 'invoices:read'
  ],
  RECEPTIONIST: [
    'patients:*', 'appointments:*', 'invoices:*', 'payments:*', 'inventory:read'
  ],
  ACCOUNTANT: ['invoices:*', 'payments:*', 'finance:*'],
  STOREKEEPER: ['inventory:*'],
  HR: ['staff:*'],
};
```

Custom roles (configured by Admin) override this map and are persisted in the database. The RBAC engine checks the database first, falling back to the static map.

### Auth Service (`src/modules/auth/auth.service.ts`)

Key methods:

| Method | Responsibility |
|---|---|
| `register(dto)` | Validate uniqueness, hash password (bcrypt cost 12), create User, emit audit log |
| `login(dto)` | Check lockout, verify password, reset/increment fail counter, issue tokens |
| `refresh(token)` | Verify token hash, rotate (revoke old, issue new), return new pair |
| `logout(accessToken, refreshToken)` | Revoke refresh token, add access token jti to deny-list |
| `changePassword(userId, dto)` | Hash new password, invalidate all refresh tokens for user |

### Auth Repository (`src/modules/auth/auth.repository.ts`)

Key methods:

| Method | Query |
|---|---|
| `findUserByEmail(email)` | `prisma.user.findUnique({ where: { email } })` |
| `createUser(data)` | `prisma.user.create(...)` |
| `incrementFailedLogin(userId)` | `prisma.user.update({ failedLoginCount: { increment: 1 } })` |
| `lockAccount(userId, until)` | `prisma.user.update({ lockedUntil: until })` |
| `resetFailedLogin(userId)` | `prisma.user.update({ failedLoginCount: 0, lockedUntil: null })` |
| `storeRefreshToken(userId, hash, expiresAt)` | `prisma.refreshToken.create(...)` |
| `findRefreshToken(hash)` | `prisma.refreshToken.findUnique({ where: { tokenHash: hash } })` |
| `revokeRefreshToken(id)` | `prisma.refreshToken.update({ revokedAt: now() })` |
| `revokeAllUserTokens(userId)` | `prisma.refreshToken.updateMany({ where: { userId } })` |

---

## API Endpoints (Phase 1)

### Auth Routes

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| POST | `/api/v1/auth/register` | No | — | Register new user |
| POST | `/api/v1/auth/login` | No | — | Login, receive token pair |
| POST | `/api/v1/auth/refresh` | No | — | Rotate refresh token |
| POST | `/api/v1/auth/logout` | Yes | — | Revoke session |

### System Routes

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| GET | `/api/v1/health` | No | — | Health check |
| GET | `/api/v1/roles` | Yes | Admin only | List roles and permissions |
| PUT | `/api/v1/roles/:roleId/permissions` | Yes | Admin only | Update role permissions |

### Request/Response Schemas

**POST /api/v1/auth/register**
```typescript
// Request body
{ username: string, email: string, password: string, role: Role }

// Response 201
{ success: true, data: { id, username, email, role, createdAt }, error: null, meta: null }
```

**POST /api/v1/auth/login**
```typescript
// Request body
{ email: string, password: string }

// Response 200
{ success: true, data: { accessToken: string, refreshToken: string, user: { id, email, role } }, error: null, meta: null }
```

**POST /api/v1/auth/refresh**
```typescript
// Request body
{ refreshToken: string }

// Response 200
{ success: true, data: { accessToken: string, refreshToken: string }, error: null, meta: null }
```

---

## Authentication Design

### JWT Strategy

- **Algorithm**: RS256 (asymmetric) — private key signs, public key verifies.
- **Access Token**: 15-minute expiry, contains `sub`, `role`, `permissions[]`, `jti`, `iat`, `exp`.
- **Refresh Token**: 7-day expiry, opaque random string (32 bytes, hex-encoded), stored as bcrypt hash in DB.
- **Token Rotation**: Each refresh call invalidates the previous refresh token and issues a new one.
- **Deny-list**: Access token `jti` values are stored in memory (Phase 1) with TTL matching token expiry. Phase 5 migrates to Redis.

### Registration Flow

```
1. Validate payload (Zod): email format, password strength (≥8 chars, uppercase, digit, special char)
2. Check email uniqueness → 409 if exists
3. Hash password: bcrypt.hash(password, 12)
4. prisma.user.create({ email, username, passwordHash, role })
5. Write AuditLog: { action: CREATE, resource: 'User', resourceId: user.id }
6. Return 201 with user data (no password hash)
```

### Login Flow

```
1. Validate payload (Zod)
2. Find user by email → if not found, return 401 "Invalid credentials" (timing-safe)
3. Check lockedUntil → if locked and not expired, return 429
4. bcrypt.compare(password, user.passwordHash)
5a. If invalid:
    - Increment failedLoginCount
    - If failedLoginCount >= 5: set lockedUntil = now + 15min
    - Write AuditLog: LOGIN_FAILED
    - Return 401 "Invalid credentials"
5b. If valid:
    - Reset failedLoginCount = 0, lockedUntil = null
    - Generate accessToken (JWT, RS256, 15min)
    - Generate refreshToken (crypto.randomBytes(32).toString('hex'))
    - Hash refreshToken with bcrypt(cost 10) → store in RefreshToken table
    - Write AuditLog: LOGIN
    - Return 200 with token pair
```

### Token Refresh Flow

```
1. Receive refreshToken string
2. Hash it → look up in RefreshToken table by tokenHash
3. Check: exists, not revoked, not expired → 401 if any fail
4. Revoke old RefreshToken (set revokedAt)
5. Issue new accessToken + new refreshToken
6. Store new refreshToken hash
7. Return new token pair
```

### Logout Flow

```
1. Authenticate request (valid accessToken required)
2. Receive refreshToken in body
3. Revoke RefreshToken record
4. Add accessToken jti to deny-list (TTL = remaining exp time)
5. Write AuditLog: LOGOUT
6. Return 200
```

---

## RBAC Design

### Permission Check Algorithm

```typescript
function hasPermission(userRole: Role, userPermissions: string[], required: string): boolean {
  // 1. Admin wildcard
  if (userPermissions.includes('*')) return true;
  // 2. Exact match
  if (userPermissions.includes(required)) return true;
  // 3. Wildcard resource match (e.g. 'treatments:*' covers 'treatments:read')
  const [resource] = required.split(':');
  if (userPermissions.includes(`${resource}:*`)) return true;
  return false;
}
```

### Ownership Check Pattern

For Patient-role users, the `authorizeOwner` middleware extracts the resource's `patientId` from the route params or query, then compares it to `request.user.sub`. If they don't match, it returns 403.

```typescript
// Example: GET /api/v1/appointments/:id (Patient can only see their own)
preHandler: [authenticate, authorizeOwner('appointments:read', async (req) => {
  const appt = await appointmentRepo.findById(req.params.id);
  return appt?.patientId;
})]
```

### Custom Role Persistence

Custom roles are stored in a `RolePermission` table (Phase 1 foundation, full CRUD in Phase 2). The RBAC engine loads custom permissions at startup and caches them in memory, refreshing on `PUT /api/v1/roles/:roleId/permissions`.

---

## Security Design

### HTTP Security Headers

Applied via a global `onSend` hook in `src/plugins/securityHeaders.ts`:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

### Rate Limiting

Using `@fastify/rate-limit`:
- Public endpoints: 100 req/min per IP
- Protected endpoints: 300 req/min per authenticated user (keyed on `request.user.sub`)
- Auth endpoints (login/register): 20 req/min per IP (stricter, brute-force protection)

### Input Validation

All request bodies and query params are validated with **Zod** schemas before reaching controllers. Validation errors are caught by a global error handler and formatted as HTTP 422 with per-field messages.

### Password Security

- bcrypt cost factor **12** for user passwords (registration, password change)
- bcrypt cost factor **10** for refresh token hashing (higher throughput needed on every refresh)
- Passwords are never logged, never returned in responses, never stored in plaintext

---

## Environment Configuration

### `.env.development`
```
NODE_ENV=development
DATABASE_URL=prisma+postgres://...
JWT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n..."
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
BCRYPT_ROUNDS=12
PORT=3000
CORS_ORIGIN=http://localhost:5173
RATE_LIMIT_MAX=100
```

### `.env.test`
```
NODE_ENV=test
DATABASE_URL=postgresql://localhost:5432/dental_test
JWT_PRIVATE_KEY="..."
JWT_PUBLIC_KEY="..."
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
BCRYPT_ROUNDS=4
PORT=3001
```

### `.env.production`
```
NODE_ENV=production
DATABASE_URL=<injected by secrets manager>
JWT_PRIVATE_KEY=<injected>
JWT_PUBLIC_KEY=<injected>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
BCRYPT_ROUNDS=12
PORT=3000
CORS_ORIGIN=https://smilefix.app
```

All environment variables are validated at startup using a Zod schema in `src/config/env.ts`. The server refuses to start if any required variable is missing or malformed.

---

## Error Handling

### AppError Hierarchy

```typescript
class AppError extends Error {
  constructor(public statusCode: number, public message: string, public code: string) {}
}

class ValidationError extends AppError { /* 422 */ }
class AuthenticationError extends AppError { /* 401 */ }
class AuthorizationError extends AppError { /* 403 */ }
class NotFoundError extends AppError { /* 404 */ }
class ConflictError extends AppError { /* 409 */ }
class RateLimitError extends AppError { /* 429 */ }
```

### Global Error Handler

Registered via `fastify.setErrorHandler`. Maps `AppError` subclasses to their HTTP status codes. For unhandled errors, logs the full stack trace (never exposed to caller) and returns HTTP 500 with a generic message.

```typescript
// Response shape for errors:
{ success: false, data: null, error: "Human-readable message", meta: null }

// For 422 validation errors:
{ success: false, data: null, error: "Validation failed", meta: { fields: [{ field, message }] } }
```

---


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

---

### Property 1: Password is never stored in plaintext

*For any* valid registration payload, the `passwordHash` field stored in the database for the created User must not equal the plaintext password submitted in the request.

**Validates: Requirements 3.1**

---

### Property 2: Refresh tokens are never stored in plaintext

*For any* successful login or token refresh, the value stored in the `RefreshToken.tokenHash` column must not equal the opaque refresh token string returned to the caller.

**Validates: Requirements 4.4**

---

### Property 3: JWT structure invariant

*For any* issued Access Token, decoding the token must reveal: (a) the `alg` header field equals `RS256`, and (b) the payload contains all required claims: `sub`, `role`, `permissions`, `jti`, `iat`, `exp`.

**Validates: Requirements 3.6, 3.7**

---

### Property 4: Expired and revoked tokens are always rejected

*For any* Refresh Token that has either passed its `expiresAt` timestamp or has a non-null `revokedAt` value, submitting it to `POST /api/v1/auth/refresh` must return HTTP 401.

**Validates: Requirements 4.2**

---

### Property 5: Token rotation invalidates previous refresh token

*For any* valid Refresh Token, after a successful call to `POST /api/v1/auth/refresh`, the original token must be rejected on any subsequent refresh attempt (returns HTTP 401), while the newly issued token must be accepted.

**Validates: Requirements 4.1**

---

### Property 6: Logout invalidates the session

*For any* authenticated session (valid access token + refresh token pair), after a successful `POST /api/v1/auth/logout`, both the original access token's `jti` and the refresh token must be rejected on subsequent use.

**Validates: Requirements 4.3**

---

### Property 7: Password change invalidates all refresh tokens

*For any* user with N active Refresh Tokens, after a password change operation, all N tokens must be rejected on subsequent refresh attempts.

**Validates: Requirements 4.5**

---

### Property 8: RBAC never grants access beyond role permissions

*For any* combination of (role, permission, protected endpoint), if the role's permission set does not include the required permission (directly or via wildcard), the request must return HTTP 403 regardless of token validity.

**Validates: Requirements 5.1, 5.2**

---

### Property 9: Unauthenticated requests to protected routes always return 401

*For any* protected route, a request sent without an `Authorization` header (or with a malformed/expired token) must return HTTP 401 before any business logic executes.

**Validates: Requirements 2.4, 5.2**

---

### Property 10: Patient ownership check prevents cross-patient access

*For any* Patient-role user with ID `A`, attempting to access a resource where `patientId` equals `B` (where `B ≠ A`) must return HTTP 403.

**Validates: Requirements 5.3**

---

### Property 11: Account lockout after repeated failed logins

*For any* user account, after exactly 5 consecutive failed login attempts within a 10-minute window, the next login attempt (even with correct credentials) must return HTTP 429 until the 15-minute lockout period expires.

**Validates: Requirements 3.5**

---

### Property 12: Consistent error message for invalid credentials

*For any* login attempt that fails — whether due to a non-existent email or an incorrect password — the response body's `error` field must always equal `"Invalid credentials"` (no field-level distinction).

**Validates: Requirements 3.4**

---

### Property 13: Response envelope invariant

*For any* API response (success or error), the JSON body must contain exactly the fields `success`, `data`, `error`, and `meta`. The `success` field must be `true` for 2xx responses and `false` for 4xx/5xx responses.

**Validates: Requirements 2.2**

---

### Property 14: Validation errors always return HTTP 422 with field details

*For any* request body that fails Zod schema validation, the response must be HTTP 422 and the `meta.fields` array must contain at least one entry identifying the invalid field and its violation message.

**Validates: Requirements 2.3**

---

### Property 15: Appointment overlap detection is always correct

*For any* dentist and any two appointments where the time windows overlap (i.e., `appt1.scheduledAt < appt2.scheduledAt + appt2.durationMinutes` AND `appt2.scheduledAt < appt1.scheduledAt + appt1.durationMinutes`), attempting to create the second appointment must return HTTP 409.

**Validates: Requirements 7.3**

---

### Property 16: Soft delete preserves records

*For any* Patient record that has been "deleted" via the API, the record must still exist in the database with a non-null `deletedAt` timestamp, and must not appear in standard list/search responses.

**Validates: Requirements 6.6**

---

### Property 17: Audit log is append-only

*For any* AuditLog entry, its `createdAt`, `action`, `resource`, `resourceId`, `previousValue`, and `newValue` fields must remain unchanged after creation. No UPDATE or DELETE operation on AuditLog records must be possible through the API.

**Validates: Requirements 13.3**

---

### Property 18: Audit log captures all mutations

*For any* CREATE, UPDATE, or DELETE operation on a tracked entity (User, Patient, Appointment), exactly one AuditLog entry with the corresponding action must be created, containing the actor's `userId`, the entity name as `resource`, and the entity's ID as `resourceId`.

**Validates: Requirements 13.1, 13.2, 13.4, 13.5**

---

### Property 19: All entity primary keys are valid UUIDs

*For any* created entity (User, Patient, Appointment, RefreshToken, AuditLog), the `id` field must be a string matching the UUID v4 format (`/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`).

**Validates: Requirements 14.2**

---

### Property 20: Security headers present on all responses

*For any* HTTP response from the API (any route, any status code), the response headers must include `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Strict-Transport-Security` with `max-age=31536000`.

**Validates: Requirements 15.3**

---

### Property 21: Pagination bounds are always respected

*For any* list endpoint called with a `limit` parameter of value `L` (where `1 ≤ L ≤ 100`), the `data` array in the response must contain at most `L` items.

**Validates: Requirements 2.8**

---

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are required. They are complementary:
- **Unit tests** verify specific examples, integration points, and error conditions.
- **Property tests** verify universal invariants across randomly generated inputs.

### Property-Based Testing

**Library**: [`fast-check`](https://github.com/dubzzz/fast-check) (TypeScript-native, well-maintained, supports async).

**Configuration**: Each property test must run a minimum of **100 iterations** (`numRuns: 100`).

**Tag format** (comment above each test):
```
// Feature: dental-clinic-backend, Property N: <property_text>
```

Each correctness property defined above must be implemented as exactly **one** `fc.assert(fc.asyncProperty(...))` test.

**Example structure:**
```typescript
// Feature: dental-clinic-backend, Property 1: Password is never stored in plaintext
it('password is never stored in plaintext', async () => {
  await fc.assert(
    fc.asyncProperty(validRegistrationArb, async (payload) => {
      const user = await authService.register(payload);
      const stored = await userRepo.findById(user.id);
      expect(stored.passwordHash).not.toBe(payload.password);
      expect(await bcrypt.compare(payload.password, stored.passwordHash)).toBe(true);
    }),
    { numRuns: 100 }
  );
});
```

### Unit Testing

**Framework**: `vitest` (fast, TypeScript-native, compatible with Node.js).

Unit tests focus on:
- Specific examples demonstrating correct behavior (e.g., login with known credentials)
- Integration points between layers (e.g., controller → service → repository chain)
- Edge cases: empty strings, boundary values, null fields
- Error conditions: duplicate email, missing required fields, expired tokens

**Avoid** writing unit tests that duplicate what property tests already cover broadly.

### Test File Organization

```
src/
  modules/
    auth/
      __tests__/
        auth.service.unit.test.ts    # Unit tests for auth service
        auth.service.prop.test.ts    # Property tests for auth invariants
        auth.routes.int.test.ts      # Integration tests (full HTTP stack)
  middleware/
    __tests__/
      authorize.prop.test.ts         # Property tests for RBAC
```

### Key Test Scenarios (Unit)

| Scenario | Type | Property |
|---|---|---|
| Register with valid payload → 201 | Example | — |
| Register with duplicate email → 409 | Example | — |
| Login with correct credentials → token pair | Example | — |
| Login with wrong password → 401, same message | Example | 12 |
| 5th failed login → 429 | Example | 11 |
| Refresh with valid token → new pair | Example | 5 |
| Refresh with revoked token → 401 | Example | 4 |
| Logout → old tokens rejected | Example | 6 |
| Admin accesses admin-only route → 200 | Example | 8 |
| Receptionist accesses admin-only route → 403 | Example | 8 |
| Request without token → 401 | Example | 9 |
| Patient accesses other patient's record → 403 | Example | 10 |
| Missing required field in body → 422 | Example | 14 |
| Health endpoint → 200, no auth | Example | — |
