/**
 * Add status column to patients table.
 * Values: 'active' | 'inactive' | 'pending'
 * Default: 'active' — all existing rows get 'active' automatically.
 *
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.schema.alterTable('patients', (t) => {
    t.string('status', 20).notNullable().defaultTo('active');
  });
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.alterTable('patients', (t) => {
    t.dropColumn('status');
  });
}
