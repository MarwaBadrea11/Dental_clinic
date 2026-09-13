# TX-07: Inventory Module Clinic Isolation - COMPLETE

**Date**: 2026-09-09  
**Status**: ✅ COMPLETE - Ready for Commit  
**Module**: Inventory  
**Test Results**: 76/76 passing (2 consecutive runs)

---

## Summary

Closes cross-clinic data leaks in the inventory module and **closes the Reports.inventorySummary() gap** documented in TX-05 and TX-06. Prevents Clinic A staff from seeing/manipulating Clinic B inventory items and financial stock values.

---

## Migration Executed

**File**: `20260909000000_add_clinic_id_to_inventory.js`

**Pattern**: nullable → backfill → NOT NULL → FK RESTRICT → index

**Steps**:
1. Added nullable `clinic_id UUID` column to inventory table
2. Data loss detection: Found 1 row with NULL clinic_id (soft-deleted test data)
3. Backfilled to SmileFix Main Clinic (ID: `0fb2c694-5100-4626-9ce5-4650b6dfa7ec`)
4. Verified 0 NULL rows after backfill
5. Altered column to NOT NULL
6. Added FK constraint: `inventory.clinic_id → clinics.id (RESTRICT)`
7. Added index on `clinic_id`

**Results**:
```
BEFORE:
  Total inventory rows: 1
  
AFTER:
  Total inventory rows: 1 ✅ (zero data loss)
  Rows with NULL clinic_id: 0 ✅
  Rows with valid clinic_id FK: 1 ✅
  Backfilled to: SmileFix Main Clinic ✅
```

**Data Note**: The 1 backfilled row was soft-deleted test data (material_name: "mmmmmmmmmm", deleted_at: 2026-06-04). Preserved per zero data loss rule.

---

## Query Updates

### InventoryRepository (8 methods updated)

**1. findAll()** - List inventory items
```javascript
// OLD: const q = this.db('inventory').whereNull('deleted_at').orderBy('created_at', 'desc');
// NEW:
const q = this.db('inventory')
  .where('clinic_id', this.clinicId)
  .whereNull('deleted_at')
  .orderBy('created_at', 'desc');
```

**2. count()** - Count inventory items
```javascript
// OLD: const q = this.db('inventory').whereNull('deleted_at').count('id as total');
// NEW:
const q = this.db('inventory')
  .where('clinic_id', this.clinicId)
  .whereNull('deleted_at')
  .count('id as total');
```

**3. findById()** - Get single item by ID
```javascript
// OLD: return this.db('inventory').where({ id }).whereNull('deleted_at').first();
// NEW:
return this.db('inventory')
  .where({ id, clinic_id: this.clinicId })
  .whereNull('deleted_at')
  .first();
```

**4. create()** - Create new inventory item
```javascript
// OLD: const [item] = await this.db('inventory').insert(data).returning('*');
// NEW:
const [item] = await this.db('inventory')
  .insert({ ...data, clinic_id: this.clinicId })
  .returning('*');
```

**5. update()** - Update inventory item
```javascript
// OLD: .where({ id }).whereNull('deleted_at').update(data)
// NEW: .where({ id, clinic_id: this.clinicId }).whereNull('deleted_at').update(data)
```

**6. softDelete()** - Soft delete inventory item
```javascript
// OLD: .where({ id }).whereNull('deleted_at').update({ deleted_at: this.db.fn.now() })
// NEW: .where({ id, clinic_id: this.clinicId }).whereNull('deleted_at').update({ deleted_at: this.db.fn.now() })
```

**7. getLowStock()** - Get low-stock items
```javascript
// OLD: return this.db('inventory').whereNull('deleted_at').whereRaw('quantity <= min_stock_alert')
// NEW:
return this.db('inventory')
  .where('clinic_id', this.clinicId)
  .whereNull('deleted_at')
  .whereRaw('quantity <= min_stock_alert')
```

**8. getNearExpiry()** - Get near-expiry items
```javascript
// OLD: return this.db('inventory').whereNull('deleted_at').whereNotNull('expiry_date')...
// NEW:
return this.db('inventory')
  .where('clinic_id', this.clinicId)
  .whereNull('deleted_at')
  .whereNotNull('expiry_date')
  .where('expiry_date', '<=', thresholdStr)
```

---

### ReportsRepository.inventorySummary() (1 method updated)

**CRITICAL**: This closes the inventorySummary() gap documented in TX-05/TX-06

```javascript
// OLD - Items query: no clinic_id filter
// const q = this.db('inventory as ii').select(...).whereNull('ii.deleted_at')

// NEW - Items query: filter by clinic_id
const q = this.db('inventory as ii')
  .where('ii.clinic_id', this.clinicId)
  .select(...)
  .whereNull('ii.deleted_at')

// OLD - Summary query: no clinic_id filter
// const [summary] = await this.db('inventory').whereNull('deleted_at').select(...)

// NEW - Summary query: filter by clinic_id
const [summary] = await this.db('inventory')
  .where('clinic_id', this.clinicId)
  .whereNull('deleted_at')
  .select(
    this.db.raw('COUNT(*)::int AS total_items'),
    this.db.raw('COALESCE(SUM(quantity * unit_price), 0)::float AS total_stock_value'),
    ...
  )
```

**Financial Impact**: `total_stock_value` (Σ quantity × unit_price) is now correctly scoped per clinic.

---

## Middleware/Controller Updates

**Routes** (`inventory.routes.js`):
- Added `attachClinicContext` middleware to all inventory endpoints
- Added `attachClinicContext` to reports inventory endpoints

**Controller** (`inventory.controller.js`):
- Updated `getService()` to pass `request.clinicId` to `InventoryRepository` constructor

**Repository** (`inventory.repository.js`):
- Constructor now accepts `clinicId` parameter
- All 8 methods use `this.clinicId` for filtering

---

## Cross-Clinic Reference Validation

❌ **NOT NEEDED** - Inventory has no foreign keys to other tables. Create/update operations only accept primitives (strings, numbers, dates), no references to patients, staff, appointments, or treatments.

**Contrast with TX-03/04/06**: Those modules required cross-clinic reference validation because they linked to other clinic-scoped entities. Inventory is self-contained.

---

## Test Coverage

**File**: `inventory.isolation.test.js` (12 new tests)

### Tests:
1. ✅ List inventory - returns only own clinic items (Clinic A perspective)
2. ✅ List inventory - returns only own clinic items (Clinic B perspective)
3. ✅ Get by ID - returns item from same clinic
4. ✅ **ISOLATION TEST**: Get by ID - returns 404 for different clinic item
5. ✅ Create - enforces own clinic_id on new items
6. ✅ Update - updates item from same clinic
7. ✅ **ISOLATION TEST**: Update - returns 404 for different clinic item
8. ✅ Delete - deletes item from same clinic
9. ✅ **ISOLATION TEST**: Delete - returns 404 for different clinic item
10. ✅ Alerts - returns only own clinic low-stock items (Clinic A)
11. ✅ Alerts - returns only own clinic low-stock items (Clinic B)
12. ✅ **INVENTORY SUMMARY LEAK TEST**: Clinic B does NOT see Clinic A stock value ($550 vs $1250)

### Test Results:
- **Inventory tests**: 12/12 passing
- **Full suite**: 76/76 passing (was 64, added 12 new tests)
- **Consistency**: 76/76 passing on 2 consecutive runs
- **Zero flakes**

---

## Attack Vectors Closed

✅ Clinic A admin listing inventory → sees only Clinic A items  
✅ Clinic A admin accessing Clinic B item by ID → 404  
✅ Clinic A admin updating Clinic B item → 404  
✅ Clinic A admin deleting Clinic B item → 404  
✅ Clinic A admin viewing low-stock alerts → sees only Clinic A alerts  
✅ Clinic A admin viewing Reports.inventorySummary() → sees only Clinic A stock value ($550), NOT Clinic B's ($1250)

---

## Documentation Updates

### ReportsRepository Class Docstring - UPDATED

**OLD**:
```javascript
/**
 * TX-06: financialSummary() is clinic-isolated (invoices/payments have
 * clinic_id as of TX-06). inventorySummary(), payrollSummary() and
 * auditLogs() are NOT yet isolated - their underlying tables
 * (inventory, staff/salary_records, audit_logs) do not have clinic_id.
 * That is separate, still-open work.
 */
```

**NEW**:
```javascript
/**
 * TX-06: financialSummary() is clinic-isolated (invoices/payments have clinic_id).
 * TX-07: inventorySummary() is NOW clinic-isolated (inventory has clinic_id).
 * 
 * REMAINING GAPS (not yet isolated):
 * - payrollSummary() - staff/salary_records/attendance_logs lack clinic_id
 * - auditLogs() - audit_logs table lacks clinic_id
 * These require separate TX work (TX-08+).
 */
```

---

## Known Remaining Gaps (Updated)

### ✅ CLOSED in TX-07:
- ~~Reports.inventorySummary()~~ - **NOW ISOLATED** (inventory table has clinic_id)

### ⚠️ STILL OPEN (deferred to TX-08+):
1. **Reports.payrollSummary()** - staff, salary_records, attendance_logs tables lack clinic_id
2. **Reports.auditLogs()** - audit_logs table lacks clinic_id

**Gap Count**: 2 remaining (down from 3 after TX-06)

---

## Files Changed (10 total)

### New Files (2):
- `src/db/migrations/20260909000000_add_clinic_id_to_inventory.js`
- `src/modules/inventory/inventory.isolation.test.js`

### Modified Files (8):
- `src/modules/inventory/inventory.routes.js` - Added attachClinicContext middleware
- `src/modules/inventory/inventory.controller.js` - Pass clinicId to repository
- `src/modules/inventory/inventory.repository.js` - All 8 queries updated with clinic_id filtering
- `src/modules/reports/reports.routes.js` - Added attachClinicContext to inventory report endpoints
- `src/modules/reports/reports.repository.js` - inventorySummary() updated + class docstring updated
- `TX07_INVESTIGATION.md` - Investigation report
- `TX07_MIGRATION_PLAN.md` - Migration plan
- `TX07_SUMMARY.md` - This document

**Lines Changed**: ~+850/-60 (approx)

---

## Security Impact

**Risk Level**: HIGH (financial data - stock values)

**Leak Closed**: Clinic A seeing Clinic B's:
- Inventory items (materials, quantities, suppliers)
- Unit prices (pricing information)
- **Stock value** (Σ quantity × unit_price) - financial metric
- Low-stock alerts (operational intelligence)
- Near-expiry alerts (operational intelligence)

**Financial Leak Example**:
- Before TX-07: Clinic A viewing Reports.inventorySummary() would see combined stock value from ALL clinics
- After TX-07: Clinic A sees only its own $550 stock value, Clinic B sees only its own $1250

---

## Verification Checklist

✅ Migration executed successfully (1 row backfilled, 0 NULL clinic_id)  
✅ Zero data loss (1 → 1 rows, including soft-deleted test data)  
✅ All 9 queries updated (8 inventory repository + 1 reports repository)  
✅ Middleware wired into routes (inventory + reports inventory endpoints)  
✅ Controller passes clinicId to repository  
✅ Isolation tests written (12 tests covering all CRUD + alerts + reports)  
✅ RED then GREEN test cycle completed  
✅ Full suite passing twice consecutively (76/76)  
✅ Documentation updated (class docstring, known gaps list)  
✅ Reports.inventorySummary() gap officially CLOSED  

---

## Next Steps

**TX-08**: Staff/Payroll Module Clinic Isolation
- Add clinic_id to staff, salary_records, attendance_logs tables
- Close Reports.payrollSummary() gap
- Estimated: 3 tables, ~12 queries, ~10-12 tests

**TX-09**: Audit Logs Clinic Isolation  
- Add clinic_id to audit_logs table
- Close Reports.auditLogs() gap  
- Estimated: 1 table, ~2 queries, ~4-6 tests
- **CAUTION**: Compliance implications (audit log isolation must preserve auditability)

---

**Follows TX-00 through TX-06 Isolation Discipline**  
**Pattern**: nullable → backfill → NOT NULL → FK → index  
**Zero Data Loss**: 1 → 1 rows preserved  
**Test Coverage**: 12 new isolation tests  
**Gap Closure**: Reports.inventorySummary() now isolated (2 gaps remain)
