/**
 * Migration: create patient_notes table
 * Stores structured timeline entries (notes, treatments, diagnoses, etc.)
 * for each patient's Medical History Timeline.
 *
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.schema.createTable('patient_notes', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('patient_id')
      .notNullable()
      .references('id')
      .inTable('patients')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    // type: one of the frontend NoteType values
    t.string('type').notNullable().defaultTo('note');
    t.string('title').notNullable();
    t.text('description').notNullable();
    t.string('doctor').notNullable();
    t.date('date').notNullable();
    t.string('status').notNullable().defaultTo('completed');
    t.decimal('cost', 10, 2).nullable();
    // who created this note (FK to users, nullable so seed data works)
    t.uuid('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index(['patient_id']);
    t.index(['date']);
    t.index(['type']);
  });

  // Auto-update updated_at
  await knex.raw(`
    CREATE TRIGGER trg_patient_notes_updated_at
    BEFORE UPDATE ON "patient_notes"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at()
  `);
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('patient_notes');
}
