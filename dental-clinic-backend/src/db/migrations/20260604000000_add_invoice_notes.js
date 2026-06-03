/**
 * Migration: Add notes column to invoices table
 * Supports the optional free-text notes field on invoice creation/editing.
 */

export async function up(knex) {
  await knex.schema.alterTable('invoices', (t) => {
    t.text('notes').nullable();
  });
}

export async function down(knex) {
  await knex.schema.alterTable('invoices', (t) => {
    t.dropColumn('notes');
  });
}
