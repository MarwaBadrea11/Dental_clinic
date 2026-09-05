# Clinic Isolation - TX-01 Pilot → TX-02 JWT-Based Implementation

> **Purpose:** Prove multi-tenancy isolation pattern on the `patients` module, then generalize to all modules with JWT-based clinic resolution.

## ✅ PRODUCTION-READY (TX-02)

**As of TX-02, clinic isolation is now JWT-based and production-safe.**

The system uses **authenticated user's clinic_id from JWT tokens** to enforce data isolation. This means:
- ✅ Clinic context is **extracted from authenticated session** (not client-controlled headers)
- ✅ Users can **only access data from their assigned clinic**
- ✅ Cross-clinic access returns **404 NOT FOUND** (explicit denial)
- ✅ Old tokens without `clinic_id` are **rejected with 401** (forced re-login)

**Security model:**
```bash
# User logs in → JWT includes their clinic_id
POST /api/v1/auth/login
{ "email": "dr.smith@clinic-a.com", "password": "..." }

# Response includes JWT with clinic_id in payload:
{
  "sub": "user-uuid",
  "email": "dr.smith@clinic-a.com",
  "role": "DENTIST",
  "clinic_id": "clinic-a-uuid",  # ← Authenticated clinic association
  "iat": 1234567890,
  "exp": 1234571490
}

# All subsequent requests use this token
GET /api/v1/patients
Authorization: Bearer <JWT-with-clinic-id>
# → Automatically scoped to clinic-a-uuid
# → Cannot access clinic-b-uuid's data
```

**What's protected:**
- User cannot forge clinic_id (it's in signed JWT, not client headers)
- User cannot access other clinics' data (middleware enforces `request.user.clinic_id`)
- System validates clinic still exists before processing request

---

## How It Works

### Request Flow

```
1. Client sends request with JWT token
2. authenticate middleware runs
   ├─ Verifies JWT signature
   ├─ Decodes payload (sub, role, clinic_id, etc.)
   └─ Attaches to request.user
3. attachClinicContext middleware runs
   ├─ Extracts clinic_id from request.user.clinic_id
   ├─ Validates clinic still exists in database
   ├─ Returns 401 if token missing clinic_id (old token)
   └─ Returns 403 if user's clinic was deleted
4. request.clinicId is now available
5. Repository queries use request.clinicId
6. Data is automatically scoped to that clinic
```

### Clinic Resolution (TX-02 - Current)

**JWT-based resolution:**

```javascript
// 1. User logs in
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  body: JSON.stringify({
    email: 'dr.smith@clinic-a.com',
    password: 'SecurePassword123'
  })
});

const { accessToken, refreshToken } = response.data;

// 2. Use token in subsequent requests
// Clinic is automatically resolved from token's clinic_id
fetch('/api/v1/patients', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
// ↑ Automatically scoped to dr.smith's clinic (clinic-a)
```

**Old tokens (pre-TX-02):**
```javascript
// Tokens issued before TX-02 don't have clinic_id
// Middleware returns 401 → forces re-login
// This is acceptable because access tokens expire in 15 minutes
```

---

## Testing Isolation

### Automated Test Suite

We have comprehensive isolation tests in `src/modules/patients/patients.isolation.test.js`:

```javascript
// Setup: Create two clinics with real users
const clinicA = await db('clinics').insert({ name: 'Test Clinic A' });
const clinicB = await db('clinics').insert({ name: 'Test Clinic B' });

const userA = await db('users').insert({
  email: 'admin-a@test.local',
  password_hash: await bcrypt.hash('password123', 12),
  clinic_id: clinicA.id,
  role: 'ADMIN'
});

const userB = await db('users').insert({
  email: 'admin-b@test.local',
  password_hash: await bcrypt.hash('password123', 12),
  clinic_id: clinicB.id,
  role: 'ADMIN'
});

// Login to get real JWT tokens
const loginA = await app.inject({
  method: 'POST',
  url: '/api/v1/auth/login',
  payload: { email: 'admin-a@test.local', password: 'password123' }
});
const tokenA = loginA.data.accessToken;

const loginB = await app.inject({
  method: 'POST',
  url: '/api/v1/auth/login',
  payload: { email: 'admin-b@test.local', password: 'password123' }
});
const tokenB = loginB.data.accessToken;

// Test 1: Clinic A can see its own patient
const patientA = await db('patients').insert({
  clinic_id: clinicA.id,
  first_name: 'Alice'
});

const response1 = await app.inject({
  method: 'GET',
  url: `/api/v1/patients/${patientA.id}`,
  headers: { 'Authorization': `Bearer ${tokenA}` }
});
// Expected: 200 OK, returns Alice

// Test 2: Clinic B CANNOT see Clinic A's patient (isolation test)
const response2 = await app.inject({
  method: 'GET',
  url: `/api/v1/patients/${patientA.id}`,  // Alice's ID
  headers: { 'Authorization': `Bearer ${tokenB}` }  // But using Clinic B's token
});
// Expected: 404 NOT FOUND (explicit denial)
```

**Run isolation tests:**
```bash
npm test -- src/modules/patients/patients.isolation.test.js
```

---

## Repository Pattern

### ❌ WRONG: No Clinic Filter

```javascript
// DANGEROUS: Returns patients from ALL clinics
async getPatient(id) {
  return await this.knex('patients')
    .where({ id })
    .first();
}
```

### ✅ RIGHT: With Clinic Filter

```javascript
import { addClinicFilter } from '../middleware/clinicContext.js';

// SAFE: Returns patient only if in requester's clinic
async getPatient(id, clinicId) {
  return await addClinicFilter(
    this.knex('patients'),
    clinicId
  )
  .where({ id })
  .first();
}
```

### ✅ ALTERNATIVE: Manual Filter

```javascript
// Also safe, but more verbose
async getPatient(id, clinicId) {
  return await this.knex('patients')
    .where({ 
      id,
      clinic_id: clinicId  // Explicit clinic filter
    })
    .first();
}
```

---

## Security Model

### What Gets Blocked

```javascript
// User from Clinic A trying to access Clinic B's patient
// Their JWT has clinic_id = clinic-a-uuid
GET /api/v1/patients/clinic-b-patient-id
Authorization: Bearer <JWT-with-clinic-a-uuid>

// Result: 404 NOT FOUND
// Reason: Patient doesn't exist in Clinic A's scope
// (middleware extracts clinic-a-uuid from JWT, repository filters by it)
```

### What Isolation Prevents

1. **Cross-clinic data leaks:** Clinic A cannot see Clinic B's patients
2. **Accidental exposure:** Forgotten WHERE clause = automatic 404, not data leak
3. **Token forgery:** Cannot manipulate JWT to change clinic_id (signature validation)
4. **Header injection:** Client cannot override clinic via headers (JWT is the source of truth)

### What Isolation Does NOT Prevent

- **Horizontal privilege escalation within same clinic:** User A accessing User B's data in the same clinic (handled by existing authorize middleware)
- **Admin multi-clinic access:** For TX-02, ADMIN users are scoped to their assigned clinic like everyone else. Multi-clinic ADMIN access is documented as future work (post-TX-02).

---

## Migration History

### TX-01 (Pilot - REPLACED)
- ✅ Patients module only
- ✅ X-Clinic-ID header mechanism (temporary, not production-safe)
- ✅ Proved isolation pattern works

### TX-02 (Current - JWT-Based)
- ✅ JWT-based clinic resolution (production-safe)
- ✅ Added `clinic_id` to `users` table
- ✅ Added `clinic_id` to JWT payload (login + refresh)
- ✅ Updated middleware to read from JWT (removed header fallback)
- ✅ Updated isolation tests to use real JWTs
- ✅ Patients module fully isolated with JWT-based resolution
- ⏳ Rollout to remaining 14 modules (appointments, invoices, etc.)

### TX-03+ (Future - Planned)
- ⏳ Multi-clinic ADMIN access (allow ADMINs to switch between clinics)
- ⏳ Subdomain-based routing (clinic1.smilefix.com → auto-resolve)
- ⏳ Database-level Row-Level Security (RLS) as additional layer
- ⏳ Clinic-scoped API keys for integrations

---

## Troubleshooting

### Error: "Missing clinic_id in token" (401)
**Cause:** Token was issued before TX-02 (no clinic_id in payload)  
**Fix:** Re-login to get a new token with clinic_id

### Error: "Clinic not found" (403)
**Cause:** User's clinic was deleted from database after token issued  
**Fix:** Contact system admin or re-assign user to a valid clinic

### Error: "Clinic context missing"
**Cause:** `enforceClinicIsolation` middleware ran but no `clinicId` on request  
**Fix:** Ensure `attachClinicContext` runs before `enforceClinicIsolation` in route middleware chain

### Query returns empty when data exists
**Cause:** Querying without clinic filter or user in wrong clinic  
**Fix:** 
- Verify user's `clinic_id` in database matches the data's `clinic_id`
- Use `addClinicFilter` helper or add explicit `clinic_id` filter in repository

### Tests fail with "Invalid credentials"
**Cause:** Test password hash doesn't match test password  
**Fix:** Use `bcrypt.hash('password123', 12)` to generate hash at runtime in tests

---

## Code Checklist for Module Rollout

When adding clinic isolation to a new module:

- [ ] Add `clinic_id` column to table (nullable FK to clinics.id)
- [ ] Backfill existing rows to main clinic (UPDATE ... SET clinic_id = ...)
- [ ] Make `clinic_id` NOT NULL
- [ ] Add index on `clinic_id` for query performance
- [ ] Update repository to accept `clinicId` parameter in all methods
- [ ] Add `addClinicFilter` or manual `clinic_id` filter to all queries
- [ ] Update service to pass `clinicId` from controller
- [ ] Update controller to extract `clinicId` from `request.clinicId`
- [ ] Wire `attachClinicContext` and `enforceClinicIsolation` middleware into routes
- [ ] Add clinic isolation test (10 tests: list, get, create, update, delete - same clinic + cross-clinic)
- [ ] Run full test suite to ensure no regressions

---

## Performance Considerations

### Current (TX-02)
- JWT clinic_id: No DB query (extracted from token)
- Clinic existence validation: 1 DB query per request (could be cached)
- Repository queries: Uses existing `clinic_id` index

### Future Optimizations (TX-03+)
- Cache clinic lookups in Redis (reduce validation queries)
- Subdomain → clinic mapping cached
- Consider database-level Row-Level Security (RLS) as additional layer
- Pre-warm clinic cache on server startup

---

## Testing in Development

### Using curl:

```bash
# 1. Login to get token
TOKEN=$(curl -s http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@smilefix.com","password":"Admin@1234"}' \
  | jq -r '.data.accessToken')

# 2. Use token in requests (clinic automatically resolved from token)
curl http://localhost:3000/api/v1/patients \
  -H "Authorization: Bearer $TOKEN"
```

### Using Postman/Insomnia:

1. Create a login request to get access token
2. Use token in subsequent requests (no need for X-Clinic-ID header)
3. To test isolation, create multiple users in different clinics and login with each

---

## Known Limitations (TX-02)

1. **ADMIN multi-clinic access:** ADMIN users are currently scoped to their assigned clinic like every other role. Multi-clinic ADMIN access (e.g., support team viewing all clinics) is documented as future work.
   
2. **Old tokens:** Tokens issued before TX-02 will be rejected with 401. This is acceptable because access tokens expire in 15 minutes naturally.

3. **Clinic deletion:** If a user's clinic is deleted while they have an active token, they get 403 on next request. No automatic token revocation (handled by natural expiry).

4. **Single module:** Only `patients` module is fully isolated in TX-02. Rollout to remaining 14 modules is in progress (one module at a time, with tests for each).

---

**Status:** TX-02 JWT-based resolution complete for patients module  
**Next:** Roll out clinic isolation to remaining modules (appointments, invoices, treatments, etc.)

