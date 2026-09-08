/**
 * TX-06: Add clinic_id to invoices table
 *
 * Part of invoices/finance module isolation, following the verified
 * TX-01/03/04 pattern (nullable -> backfill -> NOT NULL).
 *
 * Backfill source: the invoice's own patient (patients.clinic_id), since
 * every invoice already has a patient_id and every patient already has a
 * clinic_id (TX-01).
 *
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  console.log('TX-06: Adding clinic_id to invoices...');

  const beforeCount = await knex('invoices').count('* as count').first();
  console.log(`   Invoices before migration: ${beforeCount.count}`);

  console.log('   Step 1: Adding clinic_id column...');
  await knex.schema.alterTable('invoices', (t) => {
    t.uuid('clinic_id')
      .nullable()
      .references('id')
      .inTable('clinics')
      .onDelete('RESTRICT')
      .onUpdate('CASCADE');
    t.index(['clinic_id']);
  });

  console.log('   Step 2: Backfilling from patient clinic_id...');
  const updatedCount = await knex('invoices')
    .whereNull('clinic_id')
    .update({
      clinic_id: knex('patients')
        .select('clinic_id')
        .where('patients.id', knex.raw('invoices.patient_id'))
        .limit(1),
    });
  console.log(`   Backfilled ${updatedCount} invoices from their patient's clinic`);

  const nullCount = await knex('invoices').whereNull('clinic_id').count('* as count').first();
  if (parseInt(nullCount.count) > 0) {
    throw new Error(
      `Backfill incomplete: ${nullCount.count} invoices still have NULL clinic_id ` +
      '(orphaned invoice with invalid patient_id).'
    );
  }

  const afterBackfillCount = await knex('invoices').count('* as count').first();
  if (beforeCount.count !== afterBackfillCount.count) {
    throw new Error(`DATA LOSS DETECTED: Before=${beforeCount.count}, After=${afterBackfillCount.count}`);
  }

  console.log('   Step 3: Making clinic_id NOT NULL...');
  await knex.schema.alterTable('invoices', (t) => {
    t.uuid('clinic_id').notNullable().alter();
  });

  console.log(`✓ TX-06 complete: ${afterBackfillCount.count} invoices migrated (no data loss)`);
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.alterTable('invoices', (t) => {
    t.dropColumn('clinic_id');
  });
}
