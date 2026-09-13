# TX-07: Inventory Clinic Isolation - Migration Plan

**Date**: 2026-09-09  
**Target**: Add clinic_id to inventory table  
**Pattern**: nullable → backfill → NOT NULL → FK → index (established TX-01/02/03/04/06 pattern)

---

## Current State

**Table**: `inventory`  
**Current Row Count**: 1 row  
**Row Status**: Soft-deleted (deleted_at = 2026-06-04T11:04:00.760Z)  
**Data Type**: Test/placeholder data (material_name: "mmmmmmmmmm", supplier_info: "mmmmmmmmmmmmm")

**Note**: Even though this is soft-deleted test data, we follow the **zero data loss rule** - it WILL be backfilled, not deleted.

**Default Clinic**:
- ID: `0fb2c694-5100-4626-9ce5-4650b6dfa7ec`
- Name: SmileFix Main Clinic
- Slug: smilefix-main-clinic

---

## Migration File

**Filename**: `20260909000000_add_clinic_id_to_inventory.js`

**Steps**:

### Step 1: Add nullable clinic_id column
```sql
ALTER TABLE inventory ADD COLUMN clinic_id UUID;
```

### Step 2: Backfill from default clinic
```sql
-- Assign all existing inventory rows (including soft-deleted) to SmileFix Main Clinic
UPDATE inventory 
SET clinic_id = '0fb2c694-5100-4626-9ce5-4650b6dfa7ec'
WHERE clinic_id IS NULL;
```

**Expected Impact**: 1 row updated (including the soft-deleted test row)

### Step 3: Data loss detection query (run BEFORE backfill)
```sql
-- Check for orphaned inventory (should be 0 after backfill)
SELECT COUNT(*) as orphaned_count 
FROM inventory 
WHERE clinic_id IS NULL;
```

**Expected Result BEFORE backfill**: 1  
**Expected Result AFTER backfill**: 0

### Step 4: Make clinic_id NOT NULL
```sql
ALTER TABLE inventory ALTER COLUMN clinic_id SET NOT NULL;
```

### Step 5: Add FK constraint
```sql
ALTER TABLE inventory 
ADD CONSTRAINT inventory_clinic_id_fkey 
FOREIGN KEY (clinic_id) 
REFERENCES clinics(id) 
ON DELETE RESTRICT;
```

### Step 6: Add index
```sql
CREATE INDEX idx_inventory_clinic_id ON inventory(clinic_id);
```

---

## Verification Queries

### Before Migration:
```sql
-- Total inventory rows (including soft-deleted)
SELECT COUNT(*) as total FROM inventory;
-- Expected: 1

-- Rows with NULL clinic_id
SELECT COUNT(*) as null_clinic_id FROM inventory WHERE clinic_id IS NULL;
-- Expected: 1

-- Sample row
SELECT id, material_name, category, quantity, deleted_at FROM inventory LIMIT 1;
```

### After Migration:
```sql
-- Total inventory rows (should be unchanged)
SELECT COUNT(*) as total FROM inventory;
-- Expected: 1 (zero data loss ✓)

-- Rows with NULL clinic_id (should be 0)
SELECT COUNT(*) as null_clinic_id FROM inventory WHERE clinic_id IS NULL;
-- Expected: 0

-- All rows have valid clinic_id FK
SELECT COUNT(*) as valid_fk 
FROM inventory i 
JOIN clinics c ON i.clinic_id = c.id;
-- Expected: 1

-- Verify backfill to correct clinic
SELECT 
  i.id, 
  i.material_name, 
  i.clinic_id, 
  c.name as clinic_name,
  i.deleted_at
FROM inventory i 
JOIN clinics c ON i.clinic_id = c.id;
-- Expected: 1 row with clinic_name = 'SmileFix Main Clinic'
```

---

## Expected Results Summary

| Metric | Before | After | Data Loss |
|--------|--------|-------|-----------|
| Total inventory rows | 1 | 1 | ✅ 0 rows lost |
| Rows with NULL clinic_id | 1 | 0 | N/A |
| Rows with valid clinic_id FK | 0 | 1 | N/A |
| Soft-deleted rows preserved | 1 | 1 | ✅ Preserved |

**Zero Data Loss Confirmation**: 1 → 1 rows, including soft-deleted test data

---

## Migration Code

```javascript
/**
 * TX-07: Add clinic_id to inventory table
 * 
 * PATTERN: nullable → backfill → NOT NULL → FK → index
 * 
 * BACKFILL STRATEGY: Assign all existing inventory (including soft-deleted
 * test data) to SmileFix Main Clinic (first clinic by created_at).
 * 
 * DATA: 1 existing row (soft-deleted test data with material_name "mmmmmmmmmm"),
 * will be preserved per zero data loss rule.
 * 
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  // Get default clinic ID
  const [defaultClinic] = await knex('clinics')
    .select('id')
    .orderBy('created_at', 'asc')
    .limit(1);

  if (!defaultClinic) {
    throw new Error('TX-07: No clinics found - cannot backfill inventory.clinic_id');
  }

  console.log(`TX-07: Using default clinic ID: ${defaultClinic.id}`);

  // Step 1: Add nullable clinic_id column
  await knex.schema.alterTable('inventory', (t) => {
    t.uuid('clinic_id').nullable();
  });

  // Step 2: Data loss detection - check for orphaned inventory before backfill
  const [beforeBackfill] = await knex('inventory')
    .whereNull('clinic_id')
    .count('* as count');
  console.log(`TX-07: Found ${beforeBackfill.count} inventory rows to backfill (including soft-deleted)`);

  // Step 3: Backfill - assign all inventory to default clinic
  const backfilled = await knex('inventory')
    .whereNull('clinic_id')
    .update({ clinic_id: defaultClinic.id });
  console.log(`TX-07: Backfilled ${backfilled} inventory rows to clinic ${defaultClinic.id}`);

  // Step 4: Verify zero orphaned rows after backfill
  const [afterBackfill] = await knex('inventory')
    .whereNull('clinic_id')
    .count('* as count');
  
  if (Number(afterBackfill.count) > 0) {
    throw new Error(`TX-07: Backfill failed - ${afterBackfill.count} inventory rows still have NULL clinic_id`);
  }
  console.log('TX-07: Backfill verification passed - 0 NULL clinic_id rows');

  // Step 5: Make clinic_id NOT NULL
  await knex.schema.alterTable('inventory', (t) => {
    t.uuid('clinic_id').notNullable().alter();
  });

  // Step 6: Add FK constraint
  await knex.schema.alterTable('inventory', (t) => {
    t.foreign('clinic_id')
      .references('id')
      .inTable('clinics')
      .onDelete('RESTRICT');
  });

  // Step 7: Add index
  await knex.schema.alterTable('inventory', (t) => {
    t.index('clinic_id');
  });

  console.log('TX-07: Migration complete - inventory.clinic_id added with FK and index');
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.alterTable('inventory', (t) => {
    t.dropForeign('clinic_id');
    t.dropIndex('clinic_id');
    t.dropColumn('clinic_id');
  });
}
```

---

## Risk Assessment

**Risk**: LOW
- Only 1 row exists (soft-deleted test data)
- Backfill strategy is straightforward (no complex FK traversal)
- Pattern proven across TX-01/02/03/04/06

**Rollback**: Supported via `down()` migration (drops column, FK, and index)

---

## User Notification

**Data Being Backfilled**:
- 1 inventory row (soft-deleted test data)
- Material name: "mmmmmmmmmm" (placeholder)
- Supplier info: "mmmmmmmmmmmmm" (placeholder)
- Deleted at: 2026-06-04T11:04:00.760Z

**Recommendation**: This appears to be test data, but it will be preserved and backfilled to SmileFix Main Clinic per the zero data loss rule. User can manually delete it later if unwanted (soft-delete is already set, so it won't appear in normal queries).

---

**Status**: ✅ MIGRATION PLAN READY  
**Next Step**: User approval, then execute migration and show before/after verification queries
