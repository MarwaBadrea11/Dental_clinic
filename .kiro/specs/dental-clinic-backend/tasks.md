# Implementation Plan: Dental Clinic Backend — Phase 1 (Foundation)

## Overview

Bootstrap the Node.js/Fastify v5/TypeScript/Prisma v7 project with authentication, RBAC, core database schema, and all supporting infrastructure. Each task builds incrementally toward a fully wired, testable auth system.

## Tasks

- [x] 1. Install dependencies and configure TypeScript
  - Run `npm install @fastify/jwt @fastify/rate-limit @fastify/helmet dotenv zod bcrypt && npm install --save-dev @types/bcrypt @types/node typescript tsx vitest fast-check` inside `dental-clinic-backend/`
  - Create `tsconfig.json` targeting ES2022, module `NodeNext`, strict mode enabled, `outDir: dist`, `rootDir: src`
  - Add scripts to `package.json`: `dev`, `build`, `start`, `test` (vitest --run), `db:migrate`
  - _Requirements: 1.1, 15.4, 15.9_

- [x] 2. Write Prisma schema and run migration
  - [x] 2.1 Write `prisma/schema.prisma` with all Phase 1 models
    - Define enums: `Role`, `AppointmentStatus`, `AuditAction`
    - Define models: `User`, `Patient`, `Appointment`, `RefreshToken`, `AuditLog` exactly as specified in the design document
    - Include all `@@index` directives, `onDelete`/`onUpdate` behaviors, and `@updatedAt` fields
    - Set `output = "../generated/prisma"` in the generator block and `url = env("DATABASE_URL")` in the datasource block
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_
  - [ ]* 2.2 Write property test for primary key UUID invariant
    - **Property 19: All entity primary keys are valid UUIDs**
    - **Validates: Requirements 14.2**
  - [x] 2.3 Run `npx prisma migrate dev --name init` to apply the schema
    - _Requirements: 14.4_

- [x] 3. Implement environment config and core utilities
  - [x] 3.1 Create `src/config/env.ts` — Zod-validated env schema
    - Parse and export all required env vars: `NODE_ENV`, `DATABASE_URL`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`, `BCRYPT_ROUNDS`, `PORT`, `CORS_ORIGIN`, `RATE_LIMIT_MAX`
    - Throw a descriptive error at startup if any required variable is missing or malformed
    - _Requirements: 15.4, 15.9_
  - [x] 3.2 Create `src/utils/errors.ts` — AppError class hierarchy
    - Implement `AppError` base class and subclasses: `ValidationError` (422), `AuthenticationError` (401), `AuthorizationError` (403), `NotFoundError` (404), `ConflictError` (409), `RateLimitError` (429)
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7_
  - [x] 3.3 Create `src/utils/response.ts` — response envelope helpers
    - Implement `successResponse(data, meta?)` and `errorResponse(message, meta?)` returning the standard `{ success, data, error, meta }` shape
    - _Requirements: 2.2_
  - [ ]* 3.4 Write property test for response envelope invariant
    - **Property 13: Response envelope invariant**
    - **Validates: Requirements 2.2**
  - [x] 3.5 Create `src/utils/password.ts` — bcrypt helpers
    - Implement `hashPassword(plain: string, rounds: number): Promise<string>` and `verifyPassword(plain: string, hash: string): Promise<boolean>`
    - _Requirements: 3.1_
  - [ ]* 3.6 Write property test for password storage invariant
    - **Property 1: Password is never stored in plaintext**
    - **Validates: Requirements 3.1**
  - [x] 3.7 Create `src/utils/token.ts` — JWT sign/verify helpers
    - Implement `signAccessToken(payload: JwtPayload): string` using RS256 private key from env
    - Implement `verifyAccessToken(token: string): JwtPayload` using RS256 public key
    - Include `jti` (crypto.randomUUID()) in every issued token
    - _Requirements: 3.6, 3.7_
  - [ ]* 3.8 Write property test for JWT structure invariant
    - **Property 3: JWT structure invariant**
    - **Validates: Requirements 3.6, 3.7**

- [x] 4. Implement Fastify plugins
  - [x] 4.1 Create `src/plugins/prisma.ts` — Prisma client plugin
    - Instantiate `PrismaClient` and decorate the Fastify instance with `fastify.prisma`
    - Register `onClose` hook to disconnect the client on server shutdown
    - _Requirements: 15.6_
  - [x] 4.2 Create `src/plugins/jwt.ts` — @fastify/jwt RS256 plugin
    - Register `@fastify/jwt` with `{ secret: { private: env.JWT_PRIVATE_KEY, public: env.JWT_PUBLIC_KEY }, sign: { algorithm: 'RS256' } }`
    - _Requirements: 3.6_
  - [x] 4.3 Create `src/plugins/securityHeaders.ts` — HTTP security headers
    - Register a global `onSend` hook that sets `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `X-XSS-Protection`, and `Referrer-Policy` on every response
    - _Requirements: 15.3_
  - [ ]* 4.4 Write property test for security headers invariant
    - **Property 20: Security headers present on all responses**
    - **Validates: Requirements 15.3**

- [x] 5. Implement authentication middleware
  - [x] 5.1 Create `src/middleware/authenticate.ts` — JWT preHandler
    - Extract Bearer token from `Authorization` header; call `fastify.jwt.verify`; check `jti` against in-memory deny-list; attach decoded payload to `request.user`; return 401 on any failure
    - _Requirements: 2.4, 5.2_
  - [ ]* 5.2 Write property test for unauthenticated request rejection
    - **Property 9: Unauthenticated requests to protected routes always return 401**
    - **Validates: Requirements 2.4, 5.2**
  - [x] 5.3 Create `src/middleware/authorize.ts` — RBAC preHandler factory
    - Implement `hasPermission(userPermissions, required)` with wildcard support (`*`, `resource:*`)
    - Implement `authorize(permission)` factory returning a preHandler that calls `hasPermission` and returns 403 on failure
    - Implement `authorizeOwner(permission, getOwnerId)` factory for Patient-role ownership checks
    - Export `ROLE_PERMISSIONS` map for all roles defined in the design
    - _Requirements: 5.1, 5.2, 5.3_
  - [ ]* 5.4 Write property test for RBAC permission invariant
    - **Property 8: RBAC never grants access beyond role permissions**
    - **Validates: Requirements 5.1, 5.2**
  - [ ]* 5.5 Write property test for patient ownership check
    - **Property 10: Patient ownership check prevents cross-patient access**
    - **Validates: Requirements 5.3**

- [x] 6. Implement auth module
  - [x] 6.1 Create `src/modules/auth/auth.schema.ts` — Zod schemas
    - Define `RegisterSchema`: `username` (string), `email` (email format), `password` (min 8, uppercase, digit, special char), `role` (Role enum)
    - Define `LoginSchema`: `email`, `password`
    - Define `RefreshSchema`: `refreshToken` (string)
    - Define `LogoutSchema`: `refreshToken` (string)
    - _Requirements: 3.1, 3.3, 2.3_
  - [ ]* 6.2 Write property test for validation error format
    - **Property 14: Validation errors always return HTTP 422 with field details**
    - **Validates: Requirements 2.3**
  - [x] 6.3 Create `src/modules/auth/auth.repository.ts`
    - Implement all repository methods from the design: `findUserByEmail`, `findUserById`, `createUser`, `incrementFailedLogin`, `lockAccount`, `resetFailedLogin`, `storeRefreshToken`, `findRefreshToken`, `revokeRefreshToken`, `revokeAllUserTokens`
    - Accept `PrismaClient` as a constructor parameter (no direct import of the singleton)
    - _Requirements: 3.1, 3.3, 4.1, 4.4, 4.5_
  - [x] 6.4 Create `src/modules/auth/auth.service.ts`
    - Implement `register(dto)`: validate uniqueness → hash password (cost 12) → create user → write AuditLog CREATE
    - Implement `login(dto)`: check lockout → verify password → handle fail counter/lockout → issue token pair → write AuditLog LOGIN/LOGIN_FAILED
    - Implement `refresh(token)`: hash lookup → check revoked/expired → rotate tokens
    - Implement `logout(accessToken, refreshToken)`: revoke refresh token → add jti to deny-list → write AuditLog LOGOUT
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4_
  - [ ]* 6.5 Write property test for refresh token storage invariant
    - **Property 2: Refresh tokens are never stored in plaintext**
    - **Validates: Requirements 4.4**
  - [ ]* 6.6 Write property test for token rotation invariant
    - **Property 5: Token rotation invalidates previous refresh token**
    - **Validates: Requirements 4.1**
  - [ ]* 6.7 Write property test for expired/revoked token rejection
    - **Property 4: Expired and revoked tokens are always rejected**
    - **Validates: Requirements 4.2**
  - [ ]* 6.8 Write property test for logout session invalidation
    - **Property 6: Logout invalidates the session**
    - **Validates: Requirements 4.3**
  - [ ]* 6.9 Write property test for password change token invalidation
    - **Property 7: Password change invalidates all refresh tokens**
    - **Validates: Requirements 4.5**
  - [ ]* 6.10 Write property test for account lockout
    - **Property 11: Account lockout after repeated failed logins**
    - **Validates: Requirements 3.5**
  - [ ]* 6.11 Write property test for consistent invalid credentials message
    - **Property 12: Consistent error message for invalid credentials**
    - **Validates: Requirements 3.4**
  - [ ]* 6.12 Write unit tests for auth service
    - Register with valid payload → 201 with user data (no passwordHash)
    - Register with duplicate email → ConflictError (409)
    - Login with correct credentials → token pair returned
    - Login with wrong password → AuthenticationError (401), message "Invalid credentials"
    - 5th consecutive failed login → RateLimitError (429)
    - Refresh with valid token → new token pair, old token revoked
    - Logout → refresh token revoked, jti deny-listed
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3_
  - [x] 6.13 Create `src/modules/auth/auth.controller.ts`
    - Implement handlers: `registerHandler`, `loginHandler`, `refreshHandler`, `logoutHandler`
    - Each handler calls the corresponding service method and formats the response using `successResponse`/`errorResponse`
    - _Requirements: 2.2, 3.1, 3.3, 4.1, 4.3_
  - [x] 6.14 Create `src/modules/auth/auth.routes.ts`
    - Register routes under `/api/v1/auth`: POST `/register`, POST `/login`, POST `/refresh`, POST `/logout`
    - Attach Zod schema validation to each route; wire `authenticate` preHandler to `/logout`
    - _Requirements: 2.1, 3.1, 3.3, 4.1, 4.3_

- [ ] 7. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement health and roles routes
  - [x] 8.1 Create `src/modules/health/health.routes.ts`
    - Register `GET /api/v1/health` returning `{ status: 'ok', uptime, timestamp }` with no authentication required
    - _Requirements: 2.10_
  - [x] 8.2 Create `src/modules/roles/roles.routes.ts` (stub)
    - Register `GET /api/v1/roles` and `PUT /api/v1/roles/:roleId/permissions` with `authenticate` + `authorize('roles:admin')` preHandlers
    - Return stub 501 responses for now; full implementation is Phase 2
    - _Requirements: 5.4, 5.5_

- [x] 9. Wire application and entry point
  - [x] 9.1 Create `src/types/fastify.d.ts` — Fastify type augmentations
    - Augment `FastifyRequest` with `user: JwtPayload`
    - Augment `FastifyInstance` with `prisma: PrismaClient`
    - _Requirements: 15.8_
  - [x] 9.2 Create `src/types/index.ts` — shared domain types
    - Export `JwtPayload` interface, `Role` re-export, and any shared DTOs
    - _Requirements: 15.8_
  - [x] 9.3 Create `src/app.ts` — Fastify factory function
    - Export `buildApp(opts?)` that registers all plugins (prisma, jwt, cors, rateLimit, securityHeaders) and all route modules
    - Register global error handler: map `AppError` subclasses to their status codes; log stack trace for 500s; never expose internals
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 15.1, 15.2_
  - [x] 9.4 Create `src/server.ts` — entry point
    - Call `buildApp()`, listen on `env.PORT`, log startup message
    - _Requirements: 1.1_

- [x] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use `fast-check` with `numRuns: 100` minimum; each maps to a numbered property in the design document
- Unit tests use `vitest`; run with `npm test` (single-run mode via `vitest --run`)
- All code lives under `dental-clinic-backend/src/`; generated Prisma client outputs to `dental-clinic-backend/generated/prisma/`
- The deny-list for logout is in-memory in Phase 1; Phase 5 migrates it to Redis
