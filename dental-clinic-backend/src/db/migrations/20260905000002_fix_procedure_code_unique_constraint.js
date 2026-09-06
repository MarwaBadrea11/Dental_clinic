/**
 * TX-04: Fix procedure_catalog.code unique constraint
 * 
 * Original schema had code as globally unique.
 * TX-04 makes procedure_catalog per-clinic, so code should be unique per clinic, not globally.
 * 
 * This migration:
 * 1. Drops the global unique constraint on code
 * 2. Creates a composite unique constraint on (clinic_id, code)
 * 
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  // Drop the global unique constraint on code
  await knex.schema.alterTable('procedure_catalog', (t) => {
    t.dropUnique(['code']);
  });

  // Add composite unique constraint: (clinic_id, code)
  await knex.schema.alterTable('procedure_catalog', (t) => {
    t.unique(['clinic_id', 'code']);
  });
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  // Restore global unique constraint (will fail if multiple clinics have same code)
  await knex.schema.alterTable('procedure_catalog', (t) => {
    t.dropUnique(['clinic_id', 'code']);
  });

  await knex.schema.alterTable('procedure_catalog', (t) => {
    t.unique(['code']);
  });
}
