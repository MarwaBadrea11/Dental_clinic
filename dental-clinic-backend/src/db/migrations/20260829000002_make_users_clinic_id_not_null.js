/**
 * TX-02: Make users.clinic_id NOT NULL (step 3 of 3)
 * 
 * After backfill, enforce that all users must belong to a clinic.
 * This ensures no orphaned users can exist going forward.
 */
export async function up(knex) {
  // Verify no NULL values remain before making NOT NULL
  const nullCount = await knex('users')
    .whereNull('clinic_id')
    .count('* as count')
    .first();
  
  if (parseInt(nullCount.count) > 0) {
    throw new Error(
      `Cannot make clinic_id NOT NULL: ${nullCount.count} users still have NULL clinic_id. ` +
      'Run backfill migration (20260829000001) first.'
    );
  }
  
  await knex.schema.alterTable('users', (t) => {
    t.uuid('clinic_id').notNullable().alter();
  });
  
  console.log('✓ users.clinic_id is now NOT NULL - all users must belong to a clinic');
}

export async function down(knex) {
  await knex.schema.alterTable('users', (t) => {
    t.uuid('clinic_id').nullable().alter();
  });
  
  console.log('✓ users.clinic_id is now NULLABLE again');
}
