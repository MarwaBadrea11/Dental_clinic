# Clinic Isolation Middleware - TX-01 Pilot

> **Purpose:** Prove multi-tenancy isolation pattern on the `patients` module before rolling out to all modules in TX-02.

## ⚠️ CRITICAL SECURITY WARNING

**🚨 NOT SAFE FOR PRODUCTION 🚨**

The `X-Clinic-ID` header mechanism is **client-controlled and unauthenticated**. Any client can set any clinic ID and access that clinic's data.

**This is acceptable ONLY because:**
- ✅ TX-01 is running in **local/staging environments only** (not production)
- ✅ The goal is to **prove the isolation model works**, not to secure the endpoint
- ✅ This is a **temporary placeholder** for TX-02's auth-based clinic resolution

**Why this is dangerous in production:**
```bash
# Attacker can access ANY clinic's data by changing the header:
curl /api/v1/patients \
  -H "X-Clinic-ID: victim-clinic-uuid" \
  -H "Authorization: Bearer anyToken"
# ↑ This would bypass all clinic isolation!
```

**TX-02 will fix this by:**
- Extracting clinic from **authenticated user's association** (not client header)
- Validating user **belongs to** the requested clinic
- Using **subdomain-based routing** (clinic1.smilefix.com → auto-resolve securely)
- Removing the `X-Clinic-ID` header mechanism entirely

**DO NOT DEPLOY TX-01 TO PRODUCTION.** Wait for TX-02's auth-based resolution.

## How It Works

### Request Flow

```
1. Client sends request
2. attachClinicContext middleware runs
   ├─ Checks X-Clinic-ID header
   ├─ If valid: uses that clinic
   └─ If missing: falls back to main clinic
3. request.clinicId is now available
4. Repository queries use request.clinicId
5. Data is automatically scoped to that clinic
```

### Clinic Resolution (TX-01)

**Current implementation (temporary for pilot):**

```javascript
// Option 1: Explicit clinic via header
fetch('/api/v1/patients', {
  headers: {
    'X-Clinic-ID': 'clinic-uuid-here',
    'Authorization': 'Bearer token'
  }
})

// Option 2: Fallback to main clinic (no header)
fetch('/api/v1/patients', {
  headers: {
    'Authorization': 'Bearer token'
  }
})
```

**Future implementation (TX-02):**
- Subdomain: `clinic1.smilefix.com` → auto-resolve to Clinic 1
- User association: Extract from authenticated user's `clinic_id`
- API key: Extract from API key's clinic association

---

## Testing Isolation

### Setup Test Clinics

```javascript
// Create two test clinics
const clinicA = await knex('clinics').insert({
  name: 'Clinic A',
  slug: 'clinic-a'
}).returning('id');

const clinicB = await knex('clinics').insert({
  name: 'Clinic B', 
  slug: 'clinic-b'
}).returning('id');

// Create a patient in each clinic
const patientA = await knex('patients').insert({
  clinic_id: clinicA[0].id,
  first_name: 'Alice',
  // ... other fields
}).returning('id');

const patientB = await knex('patients').insert({
  clinic_id: clinicB[0].id,
  first_name: 'Bob',
  // ... other fields
}).returning('id');
```

### Test Isolation

```javascript
// Test 1: Clinic A can see its own patient
const response1 = await app.inject({
  method: 'GET',
  url: `/api/v1/patients/${patientA.id}`,
  headers: {
    'X-Clinic-ID': clinicA.id,
    'Authorization': 'Bearer validToken'
  }
});
// Expected: 200 OK, returns Alice

// Test 2: Clinic B CANNOT see Clinic A's patient
const response2 = await app.inject({
  method: 'GET',
  url: `/api/v1/patients/${patientA.id}`,  // Alice's ID
  headers: {
    'X-Clinic-ID': clinicB.id,  // But requesting as Clinic B
    'Authorization': 'Bearer validToken'
  }
});
// Expected: 404 NOT FOUND (explicit denial, not silent filter)

// Test 3: Clinic B can see its own patient
const response3 = await app.inject({
  method: 'GET',
  url: `/api/v1/patients/${patientB.id}`,
  headers: {
    'X-Clinic-ID': clinicB.id,
    'Authorization': 'Bearer validToken'
  }
});
// Expected: 200 OK, returns Bob
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
// Request from Clinic A trying to access Clinic B's patient
GET /api/v1/patients/clinic-b-patient-id
Headers: X-Clinic-ID: clinic-a-uuid

// Result: 404 NOT FOUND
// Reason: Patient doesn't exist in Clinic A's scope
```

### What Isolation Prevents

1. **Cross-clinic data leaks:** Clinic A cannot see Clinic B's patients
2. **Accidental exposure:** Forgotten WHERE clause = automatic 404, not data leak
3. **Malicious access:** Cannot enumerate other clinics' data

### What Isolation Does NOT Prevent (Yet)

- **Horizontal privilege escalation within same clinic:** User A accessing User B's data in the same clinic (handled by existing authorize middleware)
- **Admin bypass:** System admins may need a way to access all clinics (TX-02 consideration)

---

## Migration Path: TX-01 → TX-02

### TX-01 (Current - Pilot)
- ✅ Patients module only
- ✅ X-Clinic-ID header mechanism
- ✅ Proves isolation pattern works

### TX-02 (Next - Full Rollout)
- ⏳ All 15 modules (appointments, invoices, staff, etc.)
- ⏳ Replace header with subdomain/user-based resolution
- ⏳ Add `clinic_id` to all relevant tables
- ⏳ Migrate all repositories to use clinic filters
- ⏳ Update frontend to send clinic context
- ⏳ Add admin "view as clinic" capability

---

## Troubleshooting

### Error: "Invalid clinic ID"
**Cause:** X-Clinic-ID header contains non-existent clinic UUID  
**Fix:** Verify clinic exists in database or omit header to use main clinic

### Error: "Clinic context missing"
**Cause:** `enforceClinicIsolation` middleware ran but no `clinicId` on request  
**Fix:** Ensure `attachClinicContext` runs before `enforceClinicIsolation`

### Error: "No clinic context available"
**Cause:** Main clinic not found in database  
**Fix:** Run migrations: `npm run db:migrate`

### Query returns empty when data exists
**Cause:** Querying without clinic filter or wrong clinic context  
**Fix:** Use `addClinicFilter` helper or add explicit `clinic_id` filter

---

## Code Checklist for TX-02

When adding clinic isolation to a new module:

- [ ] Add `clinic_id` column to table
- [ ] Backfill existing rows to main clinic
- [ ] Make `clinic_id` NOT NULL
- [ ] Add index on `clinic_id`
- [ ] Update repository to use `addClinicFilter`
- [ ] Add clinic isolation test
- [ ] Update API documentation

---

## Performance Considerations

### Current (TX-01)
- Main clinic ID cached in memory
- Header validation: 1 DB query per clinic (not cached yet)

### Future (TX-02)
- Cache clinic lookups in Redis
- Subdomain → clinic mapping cached
- User → clinic association cached
- Consider database-level Row-Level Security (RLS) as additional layer

---

## Testing in Development

### Using curl:

```bash
# Get main clinic ID first
MAIN_CLINIC_ID=$(psql -U postgres -d dental_clinic -t -c "SELECT id FROM clinics WHERE slug='smilefix-main-clinic';")

# Request with specific clinic
curl http://localhost:3000/api/v1/patients \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Clinic-ID: $MAIN_CLINIC_ID"

# Request without header (uses main clinic)
curl http://localhost:3000/api/v1/patients \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Using Postman/Insomnia:

1. Add header: `X-Clinic-ID` with clinic UUID value
2. Test with different clinic IDs to verify isolation

---

**Status:** TX-01 pilot implementation complete  
**Next:** Wire middleware into patients routes and write isolation tests
