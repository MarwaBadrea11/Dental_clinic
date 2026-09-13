# TX-07: Inventory Module Clinic Isolation - Investigation Report

**Date**: 2026-09-08  
**Module**: Inventory  
**Status**: Investigation Complete - Ready for Migration Planning  
**Risk Level**: HIGH (financial/stock data leak)

---

## 1. Data Model Analysis

### 1.a. Tables Involved

**Primary Table**: `inventory`

**Schema**:
```
id               - uuid (PRIMARY KEY)
material_name    - varchar NOT NULL
category         - InventoryCategory enum NOT NULL
quantity         - integer NOT NULL (default 0)
unit             - varchar NOT NULL (default 'piece')
min_stock_alert  - integer NOT NULL (default 5)
expiry_date      - date (nullable)
unit_price       - numeric(10,2) NOT NULL (default 0)
supplier_info    - text (nullable)
deleted_at       - timestamp (nullable, soft delete)
created_at       - timestamp NOT NULL
updated_at       - timestamp NOT NULL
```

**Indexes**:
- category
- quantity
- expiry_date
- material_name

**Views**:
- `inventory_summary_view` - A read-only view that computes:
  - stock_value (quantity * unit_price)
  - is_low_stock (quantity <= min_stock_alert)
  - is_out_of_stock (quantity = 0)
  - is_expired (expiry_date < CURRENT_DATE)
  - is_near_expiry (expiry_date within 30 days)

**Related Tables**: NONE
- No `inventory_transactions` table
- No `inventory_usage` table
- No `inventory_suppliers` table
- Inventory is a single, flat table

---

### 1.b. Existing Clinic Linkage

**Current State**: ❌ ZERO CLINIC LINKAGE

- `inventory` table has NO `clinic_id` column
- NO foreign keys linking to clinic-scoped tables (patients, appointments, treatments, users, staff)
- NO transitive relationships that would allow inferring clinic ownership
- Completely standalone module with no existing clinic association

**Cross-Clinic Leak Confirmed**: 
- Current implementation allows Clinic A admin to see/modify ALL inventory items from Clinic B
- No middleware (attachClinicContext) present in routes
- Repository queries have no clinic_id filtering whatsoever

---

### 1.c. Shared vs Per-Clinic Assessment

**Question**: Should inventory be SHARED across clinics (like a global product catalog)?

**Answer**: ❌ NO - Inventory must be PER-CLINIC

**Reasoning**:
1. **Quantity is clinic-specific**: Each clinic has its own stock levels that should not be shared
2. **Supplier info is clinic-specific**: Different clinics may have different suppliers for the same material
3. **Pricing is clinic-specific**: Unit prices may vary between clinics based on their supplier contracts
4. **Stock alerts are clinic-specific**: min_stock_alert thresholds differ based on each clinic's consumption patterns
5. **Expiry dates are clinic-specific**: Physical inventory items belong to a specific location
6. **Financial reporting**: inventorySummary() calculates total_stock_value (quantity * unit_price) - this is a financial metric that MUST be isolated per clinic

**Analogy**: Inventory is like patients or appointments - it's location-specific operational data, not reference data.

**Contrast with procedure_catalog (TX-04)**: We determined procedure_catalog should be per-clinic because procedure codes/names/pricing are clinic-specific business data. Inventory follows the same pattern - it's not a shared catalog, it's actual physical stock.

**Conclusion**: Every row in `inventory` table must be associated with exactly one clinic.

---

## 2. Query Inventory - Repository Methods

### InventoryRepository (9 methods)

| Method | Tables | Current Filter | Needs clinic_id? | Reasoning |
|--------|--------|----------------|------------------|-----------|
| `findAll()` | inventory | whereNull('deleted_at') | ✅ YES | Lists inventory items - MUST filter by clinic_id |
| `count()` | inventory | whereNull('deleted_at') | ✅ YES | Counts inventory items - MUST filter by clinic_id |
| `findById()` | inventory | WHERE id AND deleted_at IS NULL | ✅ YES | Fetches single item - MUST verify clinic_id match |
| `create()` | inventory | INSERT | ✅ YES | Creates new item - MUST enforce clinic_id on insert |
| `update()` | inventory | WHERE id AND deleted_at IS NULL | ✅ YES | Updates item - MUST verify clinic_id match |
| `softDelete()` | inventory | WHERE id AND deleted_at IS NULL | ✅ YES | Soft deletes item - MUST verify clinic_id match |
| `getLowStock()` | inventory | whereRaw('quantity <= min_stock_alert') | ✅ YES | Lists low stock items - MUST filter by clinic_id |
| `getNearExpiry()` | inventory | WHERE expiry_date <= threshold | ✅ YES | Lists near-expiry items - MUST filter by clinic_id |

**Summary**: ALL 8 queries need clinic_id filtering. No queries are legitimately global.

---

### ReportsRepository (1 method touching inventory)

| Method | Tables | Current Filter | Needs clinic_id? | Impact |
|--------|--------|----------------|------------------|--------|
| `inventorySummary()` | inventory | whereNull('deleted_at') | ✅ YES | **CRITICAL**: This is one of the 3 known remaining gaps from TX-05/TX-06 |

**Query Details**:
- Items query: `SELECT id, material_name, quantity, unit_price, category, stock_value, is_low_stock FROM inventory WHERE deleted_at IS NULL`
- Summary aggregates: `SELECT COUNT(*), SUM(quantity * unit_price) as total_stock_value, COUNT(*) FILTER (WHERE quantity <= min_stock_alert) as low_stock_count, COUNT(*) FILTER (WHERE quantity = 0) as out_of_stock_count`

**Financial Impact**: `total_stock_value` is a financial metric - Clinic A seeing Clinic B's stock value is a financial data leak.

**Confirmation**: ✅ Fixing TX-07 (adding clinic_id to inventory) will CLOSE the Reports.inventorySummary() gap documented in TX-05 and TX-06.

---

## 3. Cross-Clinic Reference Attack Surface

**Question**: Does creating/updating inventory ever reference other clinic-scoped entities?

**Answer**: ❌ NO - No cross-clinic reference validation needed

**Analysis**:
- `inventory` table has NO foreign keys to other tables
- Create/update operations accept only:
  - material_name (string)
  - category (enum)
  - quantity (integer)
  - unit (string)
  - min_stock_alert (integer)
  - expiry_date (date)
  - unit_price (decimal)
  - supplier_info (text)
- None of these fields reference users, staff, patients, appointments, treatments, or any clinic-scoped entity

**Contrast with TX-03/TX-04/TX-06**:
- TX-03 Appointments: Had to validate patient_id, dentist_id (user) belong to same clinic
- TX-04 Treatments: Had to validate patient_id, dentist_id, procedure_catalog entries belong to same clinic
- TX-06 Invoices: Had to validate patient_id, appointment_id, treatment_plan_id belong to same clinic

**TX-07 Inventory**: No FK references = no cross-clinic reference attack surface = no validation method needed.

**Service Layer**: `InventoryService` has no create/update validation beyond schema validation - this is correct, no changes needed.

---

## 4. Reports Module Closure Confirmation

**Question**: Will fixing inventory (adding clinic_id) close the Reports.inventorySummary() gap?

**Answer**: ✅ YES - Confirmed

**Current State** (from ReportsRepository class docstring):
```javascript
/**
 * TX-06: financialSummary() is clinic-isolated (invoices/payments have
 * clinic_id as of TX-06). inventorySummary(), payrollSummary() and
 * auditLogs() are NOT yet isolated - their underlying tables
 * (inventory, staff/salary_records, audit_logs) do not have clinic_id.
 * That is separate, still-open work.
 */
```

**After TX-07**:
- `inventorySummary()` will add `WHERE clinic_id = this.clinicId` to both the items query and summary query
- Will join the 2 other unfiltered methods (payrollSummary, auditLogs) in still requiring future work

**Remaining Gaps After TX-07**:
1. ⚠️ Reports.payrollSummary() - staff/salary_records/attendance_logs tables lack clinic_id (TX-08 work)
2. ⚠️ Reports.auditLogs() - audit_logs table lacks clinic_id (TX-09 work)

---

## 5. Middleware/Routes Assessment

**Current State**: ❌ NO CLINIC CONTEXT MIDDLEWARE

**Routes** (`inventory.routes.js`):
```javascript
const readAuth  = [authenticate, authorize('inventory:read')];
const writeAuth = [authenticate, authorize('inventory:*')];

// No attachClinicContext middleware!
```

**Controller** (`inventory.controller.js`):
```javascript
function getService(request) {
  return new InventoryService(new InventoryRepository(request.server.db));
}
// Does NOT pass request.clinicId to repository constructor
```

**Required Changes**:
1. Routes: Add `attachClinicContext` middleware to all inventory routes
2. Controller: Extract `request.clinicId` and pass to `InventoryRepository` constructor
3. Repository: Accept `clinicId` in constructor, use in all 8 queries

**Follows Established Pattern**: Identical to TX-02 (Patients), TX-03 (Appointments), TX-04 (Treatments), TX-06 (Invoices)

---

## 6. Current Database State

**Row Count**: 1 inventory item (test data)

**Sample Data**:
```
ID: f5c1ef55-0a0a-4793-a208-14835b8b71de
Name: mmmmmmmmmm
Category: Medications
Quantity: 13
```

**Backfill Strategy**: Cannot backfill from any existing relationship (no FKs). Will require:
- Option A: Assign all existing inventory to a single clinic (e.g., first clinic in clinics table)
- Option B: User intervention to manually assign each item to correct clinic before migration
- Option C: Delete all test data and start fresh (only 1 row, acceptable if test data)

**Recommendation**: Check with user on backfill preference given only 1 test row exists.

---

## 7. Migration Scope Summary

### Tables to Modify: 1
- `inventory` - Add clinic_id column (nullable → backfill → NOT NULL → FK → index)

### Queries to Update: 9 total
- InventoryRepository: 8 methods
- ReportsRepository: 1 method (inventorySummary)

### Views to Update: 1
- `inventory_summary_view` - Will inherit clinic_id filtering from base table queries (no schema change needed)

### Code Files to Modify: 4
- `inventory.repository.js` - All 8 methods add clinic_id filtering
- `inventory.controller.js` - Pass request.clinicId to repository
- `inventory.routes.js` - Add attachClinicContext middleware
- `reports.repository.js` - inventorySummary() add clinic_id filtering

### Tests to Create: 1
- `inventory.isolation.test.js` - 10-12 tests covering:
  - List inventory (own clinic only)
  - Get by ID (404 for different clinic)
  - Create (enforces own clinic_id)
  - Update (404 for different clinic)
  - Delete (404 for different clinic)
  - Low stock alerts (own clinic only)
  - Near expiry alerts (own clinic only)
  - Reports.inventorySummary() isolation

---

## 8. Risk Assessment

**Risk Level**: HIGH

**Why High Risk**:
1. **Financial Data**: total_stock_value is a financial metric leaked to other clinics
2. **Operational Data**: Stock levels, pricing, supplier info are business-sensitive
3. **Reporting Impact**: Reports.inventorySummary() is currently completely unfiltered

**Mitigations**:
1. Only 1 test row exists - minimal data at risk
2. Pattern is well-established (TX-00 through TX-06)
3. No cross-clinic reference validation needed (simpler than TX-03/04/06)
4. Independent verification will catch any issues before merge

---

## 9. Recommended Migration Plan

### Phase 1: Schema Migration
1. Create migration: `20260909000000_add_clinic_id_to_inventory.js`
2. Follow nullable → backfill → NOT NULL → FK → index pattern
3. Backfill strategy: Assign all rows to first clinic OR delete test data and start fresh
4. FK constraint: `inventory.clinic_id → clinics.id (RESTRICT)`
5. Index: `clinic_id`

### Phase 2: Query Updates
1. InventoryRepository: Add `clinicId` constructor parameter, update all 8 methods
2. ReportsRepository.inventorySummary(): Add `WHERE clinic_id = this.clinicId` to both queries

### Phase 3: Middleware/Controller
1. Routes: Add `attachClinicContext` to all routes
2. Controller: Pass `request.clinicId` to repository constructor

### Phase 4: Tests
1. Create `inventory.isolation.test.js` with 10-12 tests
2. Run full suite (should be 74-76 tests after adding 10-12 new ones)

### Phase 5: Verification
1. Verify zero NULL clinic_id after backfill
2. Run test suite twice consecutively
3. Update documentation (TX-07 summary, close inventorySummary gap note)

---

## 10. Open Questions for User

**Question 1**: Backfill Strategy
- Current database has only 1 inventory row (test data)
- Option A: Assign to first clinic in clinics table
- Option B: Delete test data and start fresh
- **Recommendation**: Option B (delete and start fresh) given it's only test data

**Question 2**: Migration Timestamp
- Use tomorrow's date (20260909000000) or keep today (20260908000003)?
- **Recommendation**: Use 20260909000000 to clearly separate from TX-06 work

---

## 11. Summary

| Aspect | Finding |
|--------|---------|
| Tables requiring isolation | 1 (inventory) |
| Queries requiring updates | 9 (8 repository + 1 reports) |
| Cross-clinic reference validation needed | ❌ NO |
| Legitimately shared data | ❌ NO - all inventory must be per-clinic |
| Closes Reports.inventorySummary() gap | ✅ YES |
| Existing clinic linkage | ❌ NONE - zero existing relationships |
| Backfill complexity | LOW - only 1 test row, can delete |
| Risk level | HIGH (financial data leak) |
| Pattern match | Identical to TX-02 (Patients) |

---

**Status**: ✅ INVESTIGATION COMPLETE - Ready for migration planning and implementation

**Next Step**: User review of investigation findings, approve backfill strategy, then proceed with migration implementation following established TX-00 through TX-06 pattern.
