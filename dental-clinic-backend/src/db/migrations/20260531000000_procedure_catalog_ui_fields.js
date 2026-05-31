/**
 * Add UI display fields to procedure_catalog
 * - duration_minutes: how long the procedure takes
 * - icon: emoji icon for the catalogue card
 * - color: hex color for the catalogue card
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.schema.alterTable('procedure_catalog', (t) => {
    t.integer('duration_minutes').nullable().defaultTo(null);
    t.string('icon', 10).nullable().defaultTo(null);
    t.string('color', 20).nullable().defaultTo(null);
  });
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.alterTable('procedure_catalog', (t) => {
    t.dropColumn('duration_minutes');
    t.dropColumn('icon');
    t.dropColumn('color');
  });
}
