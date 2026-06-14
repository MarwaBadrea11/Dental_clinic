/**
 * Add extended profile fields to users table for Settings page persistence.
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.schema.alterTable('users', (t) => {
    t.string('phone').nullable().defaultTo(null);
    t.string('specialty').nullable().defaultTo(null);
    t.text('bio').nullable().defaultTo(null);
  });
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('phone');
    t.dropColumn('specialty');
    t.dropColumn('bio');
  });
}
