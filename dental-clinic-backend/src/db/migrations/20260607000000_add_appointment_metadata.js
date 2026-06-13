/**
 * Migration: add jsonb metadata column to appointments
 *
 * Used by the appointment reminder scheduler to track
 * which reminders have already been sent (e.g. reminder_2h_sent: true).
 */
export async function up(knex) {
  const hasColumn = await knex.schema.hasColumn('appointments', 'metadata');
  if (!hasColumn) {
    await knex.schema.alterTable('appointments', (t) => {
      t.jsonb('metadata').nullable().defaultTo(null);
    });
  }
}

export async function down(knex) {
  const hasColumn = await knex.schema.hasColumn('appointments', 'metadata');
  if (hasColumn) {
    await knex.schema.alterTable('appointments', (t) => {
      t.dropColumn('metadata');
    });
  }
}
