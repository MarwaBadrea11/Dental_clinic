/**
 * Add extended patient fields that the frontend form uses.
 * These columns were present in the root-level init migration but missing
 * from the src/db/migrations version that is actually run by the app.
 *
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.schema.alterTable('patients', (t) => {
    // Only add each column if it doesn't already exist (safe to re-run)
    t.string('city').nullable().defaultTo(null);
    t.text('clinical_notes').nullable().defaultTo(null);
    t.string('insurance_provider').nullable().defaultTo(null);
    t.string('insurance_policy_number').nullable().defaultTo(null);
    t.string('emergency_contact_relationship').nullable().defaultTo(null);
  });
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.alterTable('patients', (t) => {
    t.dropColumn('city');
    t.dropColumn('clinical_notes');
    t.dropColumn('insurance_provider');
    t.dropColumn('insurance_policy_number');
    t.dropColumn('emergency_contact_relationship');
  });
}
