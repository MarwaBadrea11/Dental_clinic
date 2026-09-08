# TX-05 Summary: Dashboard Module Clinic Isolation (Partial Fix)

**Date**: 2026-09-06  
**Status**: ✅ **COMPLETED** (Partial - See Known Remaining Leaks)  
**Risk Level**: CRITICAL - Active data leak confirmed and demonstrated

---

## ⚠️ CRITICAL: Confirmed Active Data Leak

**Independent security review demonstrated live cross-clinic data leak:**
- **Attack**: Clinic A receptionist called `GET /api/v1/dashboard/recent-patients`
- **Result**: Clinic B patient data (name, phone, national_id) appeared in response
- **Impact**: Complete cross-clinic patient and appointment data exposure via dashboard

---

## What TX-05 Fixed

### Dashboard Module - 6 Queries Isolated

All queries that reference **already-isolated tables** (patients, appointments, treatment_plans):

| Method | Tables | Status |
|--------|--------|--------|
| `countPatients()` | patients | ✅ FIXED - Added clinic_id filter |
| `countPatientsThisMonth()` | patients | ✅ FIXED - Added clinic_id filter |
| `countTodayAppointments()` | appointments | ✅ FIXED - Added clinic_id filter |
| `clinicEfficiency()` | appointments | ✅ FIXED - Added clinic_id filter |
| `recentPatients()` | patients + appointments + treatment_plans | ✅ FIXED - Added clinic_id filters |
| `todaySchedule()` | appointments + patients + treatment_plans | ✅ FIXED - Added clinic_id filters |

### Query Changes (OLD vs NEW)

Each query updated with:
- Constructor now accepts `clinicId` parameter
- Added `.where({ clinic_id: this.clinicId })` to WHERE clauses
- Complex queries (recentPatients, todaySchedule) filter across all joined tables

### Middleware/Controller/Service Updates

- **Routes**: Added `attachClinicContext` middleware (authenticate → attachClinicContext → authorize)
- **Controller**: Updated `getService()` to pass `request.clinicId` to repository
- **Repository**: Constructor accepts and stores `clinicId`, all 6 queries use it

### Isolation Tests

**6 new tests - All passing ✓**

Replicates demonstrated attack:
- Clinic A receptionist calls `recent-patients` → Clinic B patient NEVER appears ✓
- Clinic A receptionist calls `today-schedule` → Clinic B appointment NEVER appears ✓
- Aggregate counts (stats endpoint) isolated per clinic ✓

---

## ⚠️ KNOWN REMAINING LEAKS (Active, Unfixed)

### Dashboard Module - 1 Query Still Leaking

| Method | Tables | Status |
|--------|--------|--------|
| `pendingPaymentsSummary()` | invoices | ❌ **STILL LEAKING** - invoices table has NO clinic_id column |

**Impact**: Financial debt aggregates across ALL clinics into one number.

### Reports Module - Entire Module Still Leaking

**All 4 reports queries are COMPLETELY UNISOLATED:**

| Method | Tables | Status |
|--------|--------|--------|
| `financialSummary()` | invoices + payments | ❌ **STILL LEAKING** - Both tables lack clinic_id |
| `inventorySummary()` | inventory | ❌ **STILL LEAKING** - No clinic_id column |
| `payrollSummary()` | salary_records + staff | ❌ **STILL LEAKING** - Both tables lack clinic_id |
| `auditLogs()` | audit_logs + users | ❌ **STILL LEAKING** - audit_logs lacks clinic_id |

**Impact**:
- Financial reports aggregate across all clinics
- Inventory reports show all clinics' stock
- Payroll reports expose all clinics' salary data
- **Audit logs mix who-did-what records across clinics (compliance risk)**

---

## Why These Leaks Remain

**Root Cause**: Tables missing `clinic_id` column entirely in schema

**Tables requiring schema migration:**
1. `invoices` - Created in `20260529000000_create_phase3_tables.js`, NO clinic_id
2. `payments` - Created in `20260529000000_create_phase3_tables.js`, NO clinic_id
3. `inventory` - Created in `20260530000000_create_phase4_tables.js`, NO clinic_id
4. `staff` - Created in `20260530000000_create_phase4_tables.js`, NO clinic_id
5. `salary_records` - Created in `20260530000000_create_phase4_tables.js`, NO clinic_id
6. `audit_logs` - Created in `20260528000000_create_core_tables.js`, NO clinic_id

**Cannot fix with query filtering alone** - requires full schema migration (add column, backfill, NOT NULL, FK constraints, indexes) like TX-02/TX-03/TX-04.

---

## Future Work Required

**Each requires full TX-style implementation (schema + queries + tests):**

1. **TX-06**: Invoices + Payments isolation → Fixes `pendingPaymentsSummary()` + `financialSummary()`
2. **TX-07**: Inventory isolation → Fixes `inventorySummary()`
3. **TX-08**: Staff + Payroll isolation → Fixes `payrollSummary()`
4. **TX-09**: Audit Logs isolation → Fixes `auditLogs()` (extra care - compliance data)

---

## Testing

### New Tests
- **dashboard.isolation.test.js**: 6/6 passing
  - Replicates demonstrated recent-patients attack
  - Replicates demonstrated today-schedule attack  
  - Verifies aggregate counts isolated

### Full Test Suite
- **55/55 tests passing** (2 consecutive runs verified)
- No test interference
- Added 6 tests (was 49, now 55)

---

## Files Modified

**Core Logic** (3 files):
- `src/modules/dashboard/dashboard.routes.js` - Added attachClinicContext middleware
- `src/modules/dashboard/dashboard.controller.js` - Pass clinicId to repository
- `src/modules/dashboard/dashboard.repository.js` - 6 queries updated + documented remaining leak

**Tests** (1 file):
- `src/modules/dashboard/dashboard.isolation.test.js` - 6 new tests

**Documentation** (1 file):
- `TX05_SUMMARY.md` - This file

---

## Security Posture

### Fixed
✅ Dashboard patient/appointment data leak (confirmed attack vector)  
✅ Patient counts isolated per clinic  
✅ Appointment counts isolated per clinic  
✅ Clinic efficiency metric isolated  

### Still Vulnerable
❌ Financial debt aggregation (pendingPaymentsSummary)  
❌ ALL financial reports (revenue, payments, procedures)  
❌ ALL inventory reports  
❌ ALL payroll reports  
❌ **ALL audit logs (who-did-what records mixed across clinics)**  

---

**TX-05 Status**: ✅ **COMPLETE** (Closed demonstrated leak, documented remaining leaks for future TX work)
