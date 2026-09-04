/**
 * Migration: Add clinic_id to patients table
 * 
 * Part of TX-01: Multi-tenancy pilot on patients module
 * 
 * This migration:
 * 1. Adds clinic_id column (nullable initially)
 * 2. Creates "SmileFix Main Clinic" as the default clinic
 * 3. Backfills ALL existing patients to the main clinic
 * 4. Makes clinic_id NOT NULL (enforces constraint)
 * 
 * SAFETY: All existing patients are preserved and assigned to the main clinic.
 * This maintains backward compatibility with the current single-tenant setup.
 * 
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  console.log('📊 Starting TX-01 migration: Add clinic isolation to patients...');
  
  // Count patients before migration (for verification)
  const beforeCount = await knex('patients').count('* as count').first();
  console.log(`   Patients before migration: ${beforeCount.count}`);
  
  // Step 1: Add clinic_id column (nullable initially for backfill)
  console.log('   Step 1: Adding clinic_id column...');
  await knex.schema.alterTable('patients', (t) => {
    t.uuid('clinic_id')
      .nullable()
      .references('id')
      .inTable('clinics')
      .onDelete('RESTRICT');
    t.index(['clinic_id']);
  });
  
  // Step 2: Create the main clinic
  console.log('   Step 2: Creating SmileFix Main Clinic...');
  const [mainClinic] = await knex('clinics')
    .insert({
      name: 'SmileFix Main Clinic',
      slug: 'smilefix-main-clinic'
    })
    .returning('id');
  
  console.log(`   Created clinic with ID: ${mainClinic.id}`);
  
  // Step 3: Backfill all existing patients to the main clinic
  console.log('   Step 3: Backfilling existing patients...');
  const updatedCount = await knex('patients')
    .whereNull('clinic_id')
    .update({ clinic_id: mainClinic.id });
  
  console.log(`   Backfilled ${updatedCount} patients to main clinic`);
  
  // Step 4: Make clinic_id NOT NULL (enforce constraint)
  console.log('   Step 4: Making clinic_id NOT NULL...');
  await knex.schema.alterTable('patients', (t) => {
    t.uuid('clinic_id').notNullable().alter();
  });
  
  // Verify: Count patients after migration
  const afterCount = await knex('patients').count('* as count').first();
  console.log(`   Patients after migration: ${afterCount.count}`);
  
  // Safety check
  if (beforeCount.count !== afterCount.count) {
    throw new Error(`❌ DATA LOSS DETECTED! Before: ${beforeCount.count}, After: ${afterCount.count}`);
  }
  
  console.log('✅ TX-01 migration completed successfully!');
  console.log(`   No data loss: ${beforeCount.count} patients preserved`);
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  console.log('Rolling back: Removing clinic_id from patients...');
  
  await knex.schema.alterTable('patients', (t) => {
    t.dropColumn('clinic_id');
  });
  
  console.log('✅ Rollback complete');
}
