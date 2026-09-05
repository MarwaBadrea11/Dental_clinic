# TX-02 Progress: Generalize Multi-Tenant Isolation

**Status**: IN PROGRESS  
**Started**: 2026-09-04  
**Risk Level**: CRITICAL (patient health data)

---

## Overview

TX-02 generalizes the clinic isolation pattern proven in TX-01 to all remaining modules (~14 modules). One module at a time, with full testing and verification at each step.

**STRICT PROCESS**: No module proceeds to the next until fully tested, reviewed, and approved.

---

## Phase 1: JWT-Based Clinic Resolution (PRIORITY)

### ✅ Step 1: Add clinic_id to users table (COMPLETE)

**Why first**: Replace X-Clinic-ID header with JWT-based resolution before generalizing to more modules.

**Migrations**:
- `20260829000000_add_clinic_id_to_users.js` - Add nullable column + FK + index
- `20260829000001_backfill_users_clinic_id.js` - Backfill all 10 users to main clinic
- `20260829000002_make_users_clinic_id_not_null.js` - Enforce NOT NULL

**Verification Results**:
```
✅ Total users: 10
✅ Users with clinic_id: 10
✅ Users without clinic_id: 0
✅ All users assigned to: SmileFix Main Clinic
✅ No data loss
✅ FK constraint active

Role breakdown:
- ADMIN: 1 user
- DENTIST: 2 users
- RECEPTIONIST: 1 user
- PATIENT: 6 users
```

**⚠️ KNOWN LIMITATION - ADMIN Multi-Clinic Access**

**Current State**: ADMIN is treated exactly like every other role - scoped to a single clinic (SmileFix Main Clinic).

**Why**: 
- TX-02 focus is proving the base isolation pattern generalizes cleanly across all modules
- Adding ADMIN special-casing now adds complexity before the pattern is fully validated
- Multi-clinic ADMIN access is a separate architectural decision requiring its own design

**Impact**:
- ADMIN users can ONLY see data for their assigned clinic (same as DENTIST/RECEPTIONIST)
- No cross-clinic reporting/management capabilities for ADMIN
- Acceptable for single-clinic deployments during TX-02 rollout

**Future Work** (post-TX-02):
- Design ADMIN multi-clinic access model:
  - Option A: ADMIN has no clinic_id (nullable), sees all clinics
  - Option B: ADMIN has primary clinic_id, but middleware bypasses filter for ADMIN role
  - Option C: ADMIN-to-clinic many-to-many relationship (complex)
- Update middleware to implement chosen model
- Add ADMIN cross-clinic tests
- Update documentation

**Decision Point**: After all 14 modules have basic isolation working, revisit ADMIN access model with product owner.

---

### ⏳ Step 2: Update clinicContext middleware (IN PROGRESS)

**Goal**: Replace X-Clinic-ID header with JWT-based resolution.

**Changes needed**:
1. Read clinic_id from authenticated user's JWT (request.user.sub → users.clinic_id)
2. Remove X-Clinic-ID header fallback
3. Remove "NOT SAFE FOR PRODUCTION" warnings (JWT is authenticated)

**Status**: Planning

---

### ⏳ Step 3: Update TX-01 tests (PENDING)

**Goal**: Verify patients isolation still works with JWT-based resolution.

**Changes needed**:
1. Create test users with different clinic_ids (not just fake tokens)
2. Update patients.isolation.test.js to use real authenticated users
3. Re-run tests, confirm RED → GREEN

**Status**: Pending Step 2 completion

---

### ⏳ Step 4: Update documentation (PENDING)

**Goal**: Reflect JWT-based resolution in TX-01 docs.

**Files to update**:
- `CLINIC_ISOLATION_TX01.md` - Remove header-based approach, document JWT approach
- Update "NOT SAFE FOR PRODUCTION" sections

**Status**: Pending Steps 2-3 completion

---

## Phase 2: Module-by-Module Rollout (PENDING)

**Order** (safest → most complex):
1. ⏳ appointments
2. ⏳ treatments/procedures
3. ⏳ odontogram
4. ⏳ invoices/payments/finance
5. ⏳ inventory
6. ⏳ staff/attendance/payroll
7. ⏳ reports
8. ⏳ dashboard
9. ⏳ notifications
10. ⏳ attachments
11. ⏳ (remaining modules TBD)

**Per-Module Checklist**:
- [ ] Query inventory (list all DB queries)
- [ ] Migration (add clinic_id column)
- [ ] Wire middleware into routes
- [ ] Update repository/service/controller
- [ ] Write isolation test
- [ ] Show RED → GREEN
- [ ] Full test suite passes
- [ ] Verification (data migrated, no loss)
- [ ] Review + approval before next module

---

## Cleanup Item: Orphaned Migration

**Issue**: Untracked migration file exists locally:
- `20260617000000_add_user_id_to_patients.js`

**Status**: Investigation pending (separate from main TX-02 work)

**Action needed**:
1. Check what this migration does
2. Determine if needed or abandoned
3. Either commit properly or remove from local DB

---

## Risk Mitigation

**Why one module at a time**:
- A single missed clinic_id filter means one clinic sees another's patient data
- This is the highest-risk item in the roadmap
- No batch changes, no assumptions, no shortcuts

**Definition of Done (per module)**:
- Every query proven to filter by clinic_id (via code review)
- Isolation test exists and passes
- Full test suite passes (no regressions)
- Existing data migrated with verified before/after counts

---

**Last Updated**: 2026-09-04 (Step 1 complete)
