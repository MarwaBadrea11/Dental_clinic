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
