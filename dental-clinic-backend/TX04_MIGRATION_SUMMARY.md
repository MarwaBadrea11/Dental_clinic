# TX-04 Migration Summary: Treatments/Procedures Clinic Isolation

**Date**: 2026-09-05  
**Status**: ✅ **COMPLETED SUCCESSFULLY**  
**Risk Level**: CRITICAL (patient health data)

---

## Migration Scope

Added `clinic_id` column to three tables for multi-tenant isolation:

1. **`procedure_catalog`** — Per-clinic procedure/treatment catalog
2. **`treatment_plans`** — Patient treatment plan records
3. **`treatment_procedures`** — Individual procedure line items within plans

---

## Execution Results

### ✅ **Baseline State** (pre-migration)
- Default Clinic ID: `0fb2c694-5100-4626-9ce5-4650b6dfa7ec` (SmileFix Main Clinic)
- `procedure_catalog`: **3 rows**
- `treatment_plans`: **0 rows**
- `treatment_procedures`: **0 rows**
- `clinic_id` columns: **None existed** (expected)

### ✅ **Migration Steps Executed**

**Step 1: procedure_catalog**
- ✓ Added `clinic_id` column (nullable)
- ✓ Backfilled **3 rows** with default clinic ID
- ✓ Made NOT NULL + FK constraint to `clinics` table (RESTRICT/CASCADE)
- ✓ Added indexes: `[clinic_id]`, `[clinic_id, code]`, `[clinic_id, is_active]`

**Step 2: treatment_plans**
- ✓ Added `clinic_id` column (nullable)
- ✓ Backfilled **0 rows** (table empty)
- ✓ Made NOT NULL + FK constraint to `clinics` table (RESTRICT/CASCADE)
- ✓ Added indexes: `[clinic_id]`, `[clinic_id, patient_id]`, `[clinic_id, dentist_id]`, `[clinic_id, status]`

**Step 3: treatment_procedures**
- ✓ Added `clinic_id` column (nullable)
- ✓ Backfilled **0 rows** (table empty)
- ✓ Made NOT NULL + FK constraint to `clinics` table (RESTRICT/CASCADE)
- ✓ Added indexes: `[clinic_id]`, `[clinic_id, treatment_plan_id]`

### ✅ **Post-Migration Verification**

#### 1. Row Count Integrity
| Table | Before | After | Status |
|-------|--------|-------|--------|
| `procedure_catalog` | 3 | 3 | ✅ **MATCH** |
| `treatment_plans` | 0 | 0 | ✅ **MATCH** |
| `treatment_procedures` | 0 | 0 | ✅ **MATCH** |

#### 2. Cross-Clinic Reference Checks
All verification queries returned **0 rows** (expected):

- ✅ **Verification A**: `treatment_procedures` → `procedure_catalog` consistency  
  **Result**: 0 cross-clinic references

- ✅ **Verification B**: `treatment_plans` → `patients` consistency  
  **Result**: 0 cross-clinic references

- ✅ **Verification C**: `treatment_plans` → `users` (dentist) consistency  
  **Result**: 0 cross-clinic references

- ✅ **Verification D**: `treatment_procedures` → `treatment_plans` consistency  
  **Result**: 0 cross-clinic references

#### 3. Foreign Key Constraints
All FK constraints created successfully:

| Table | Column | References | ON DELETE | ON UPDATE |
|-------|--------|------------|-----------|-----------|
| `procedure_catalog` | `clinic_id` | `clinics.id` | RESTRICT | CASCADE |
| `treatment_plans` | `clinic_id` | `clinics.id` | RESTRICT | CASCADE |
| `treatment_procedures` | `clinic_id` | `clinics.id` | RESTRICT | CASCADE |

#### 4. Indexes Created
**procedure_catalog** (3 indexes):
- `procedure_catalog_clinic_id_index`
- `procedure_catalog_clinic_id_code_index`
- `procedure_catalog_clinic_id_is_active_index`

**treatment_plans** (4 indexes):
- `treatment_plans_clinic_id_index`
- `treatment_plans_clinic_id_patient_id_index`
- `treatment_plans_clinic_id_dentist_id_index`
- `treatment_plans_clinic_id_status_index`

**treatment_procedures** (2 indexes):
- `treatment_procedures_clinic_id_index`
- `treatment_procedures_clinic_id_treatment_plan_id_index`

---

## Key Design Decisions

### 1. **procedure_catalog is Per-Clinic** (not global)
**Rationale**:
- Clinics customize pricing (`default_cost`)
- Specialty clinics offer different procedures
- CRUD operations are not admin-restricted
- No global template seeding exists
- Treating it as shared would require major redesign (global templates + per-clinic overrides)

### 2. **Dependency-Aware Execution Order**
Migration respected the dependency chain:
```
procedure_catalog (independent)
    ↓
treatment_plans (depends on: patients, users)
    ↓
treatment_procedures (depends on: treatment_plans, procedure_catalog)
```

### 3. **unit_cost Snapshot Behavior Unaffected**
- The pricing snapshot logic in `treatments.service.js` remains unchanged
- `clinic_id` is purely for access control, not pricing logic

---

## Migration Files

- **Migration**: `src/db/migrations/20260905000001_add_clinic_id_to_treatments.js`
- **Baseline Check**: `scripts/tx04-baseline-check.mjs`
- **Executor**: `scripts/run-tx04-migration.mjs`

---

## Next Steps (TX-04 continuation)

1. ✅ **Migration Complete** — Schema isolation in place
2. ⏳ **Add JWT middleware filtering** — Extract `clinic_id` from JWT and enforce in queries
3. ⏳ **Update repository queries** — Add `.where({ clinic_id })` to all 13 identified queries
4. ⏳ **Write isolation tests** — Verify cross-clinic data leakage protection
5. ⏳ **Full test suite verification** — Ensure no regressions

---

## Rollback Plan

If needed, run:
```bash
node scripts/rollback-tx04.mjs  # (to be created if rollback needed)
```

Or manually:
```sql
ALTER TABLE treatment_procedures DROP CONSTRAINT treatment_procedures_clinic_id_foreign;
ALTER TABLE treatment_procedures DROP COLUMN clinic_id;

ALTER TABLE treatment_plans DROP CONSTRAINT treatment_plans_clinic_id_foreign;
ALTER TABLE treatment_plans DROP COLUMN clinic_id;

ALTER TABLE procedure_catalog DROP CONSTRAINT procedure_catalog_clinic_id_foreign;
ALTER TABLE procedure_catalog DROP COLUMN clinic_id;
```

---

**Migration Status**: ✅ **COMPLETE — All Verifications Passed**
