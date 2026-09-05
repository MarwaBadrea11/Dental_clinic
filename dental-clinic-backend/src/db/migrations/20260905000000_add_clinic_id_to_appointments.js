/**
 * TX-03: Add clinic_id to appointments table
 * 
 * Part of appointments module isolation following the verified TX-02 pattern.
 * 
 * This migration:
 * 1. Adds clinic_id column (nullable initially for backfill)
 * 2. Backfills ALL existing appointments by deriving clinic_id from their dentist's clinic
 * 3. Makes clinic_id NOT NULL (enforces constraint)
 * 
 * SAFETY: All existing appointments are preserved and assigned based on their dentist's clinic.
 * 
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  console.log('TX-03: Adding clinic_id to appointments...');
  
  // PRE-MIGRATION VERIFICATION
  const beforeCount = await knex('appointments').count('* as count').first();
  console.log(`   Appointments before migration: ${beforeCount.count}`);
  
  // Step 1: Add clinic_id column (nullable initially for backfill)
  console.log('   Step 1: Adding clinic_id column...');
  
  await knex.schema.alterTable('appointments', (t) => {
    t.uuid('clinic_id')
      .nullable()
      .references('id')
      .inTable('clinics')
      .onDelete('RESTRICT')  // Don't allow deleting a clinic if appointments exist
      .onUpdate('CASCADE');
    t.index(['clinic_id']);  // Index for filtering queries
  });
  
  console.log('   ✓ clinic_id column added (nullable)');
  
  // Step 2: Backfill existing appointments
  // Derive clinic_id from the dentist's clinic (appointments.dentist_id → users.clinic_id)
  console.log('   Step 2: Backfilling existing appointments...');
  
  const updatedCount = await knex('appointments')
    .whereNull('clinic_id')
    .update({
      clinic_id: knex('users')
        .select('clinic_id')
        .where('users.id', knex.raw('appointments.dentist_id'))
        .limit(1)
    });
  
  console.log(`   ✓ Backfilled ${updatedCount} appointments from their dentist's clinic`);
  
  // POST-BACKFILL VERIFICATION
  const afterBackfillCount = await knex('appointments').count('* as count').first();
  const nullCount = await knex('appointments').whereNull('clinic_id').count('* as count').first();
  
  console.log(`   Verification: ${afterBackfillCount.count} appointments total, ${nullCount.count} still NULL`);
  
  if (parseInt(nullCount.count) > 0) {
    throw new Error(
      `Backfill incomplete: ${nullCount.count} appointments still have NULL clinic_id. ` +
      'This indicates orphaned appointments with invalid dentist_id.'
    );
  }
  
  if (beforeCount.count !== afterBackfillCount.count) {
    throw new Error(
      `DATA LOSS DETECTED: Before=${beforeCount.count}, After=${afterBackfillCount.count}`
    );
  }
  
  // Step 3: Make clinic_id NOT NULL (enforce constraint)
  console.log('   Step 3: Making clinic_id NOT NULL...');
  
  await knex.schema.alterTable('appointments', (t) => {
    t.uuid('clinic_id').notNullable().alter();
  });
  
  console.log('   ✓ clinic_id is now NOT NULL');
  
  // FINAL VERIFICATION
  const finalCount = await knex('appointments').count('* as count').first();
  console.log(`✓ TX-03 complete: ${finalCount.count} appointments migrated (no data loss)`);
  
  if (beforeCount.count !== finalCount.count) {
    throw new Error(
      `FINAL VERIFICATION FAILED: Before=${beforeCount.count}, Final=${finalCount.count}`
    );
  }
}

/**
 * Rollback: Remove clinic_id from appointments
 * WARNING: This will lose the clinic association data!
 */
export async function down(knex) {
  console.log('Rolling back: Removing clinic_id from appointments...');
  
  const beforeCount = await knex('appointments').count('* as count').first();
  console.log(`   Appointments before rollback: ${beforeCount.count}`);
  
  await knex.schema.alterTable('appointments', (t) => {
    t.dropColumn('clinic_id');
  });
  
  const afterCount = await knex('appointments').count('* as count').first();
  console.log(`✓ Rollback complete: ${afterCount.count} appointments (clinic_id removed)`);
  
  if (beforeCount.count !== afterCount.count) {
    throw new Error(
      `DATA LOSS DURING ROLLBACK: Before=${beforeCount.count}, After=${afterCount.count}`
    );
  }
}
