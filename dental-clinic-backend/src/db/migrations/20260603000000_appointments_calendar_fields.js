/**
 * Migration: add calendar-required fields to appointments and patients.
 *
 * appointments:
 *   - chair_number  VARCHAR(10)  — which dental chair (required by conflict check)
 *   - treatment_name VARCHAR(255) — display label shown in the calendar UI
 *
 * patients:
 *   - patient_code  VARCHAR(20) UNIQUE — human-readable code e.g. SF-00001
 *     Generated via a sequence so every existing row gets a stable code.
 *
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  // ── appointments ────────────────────────────────────────────────────────────
  const hasChair = await knex.schema.hasColumn('appointments', 'chair_number');
  const hasTreatment = await knex.schema.hasColumn('appointments', 'treatment_name');

  await knex.schema.alterTable('appointments', (t) => {
    if (!hasChair)     t.string('chair_number', 10).nullable().defaultTo('1');
    if (!hasTreatment) t.string('treatment_name', 255).nullable();
  });

  // ── patients: patient_code ───────────────────────────────────────────────────
  const hasCode = await knex.schema.hasColumn('patients', 'patient_code');
  if (!hasCode) {
    // Create a sequence for the numeric part
    await knex.raw(`CREATE SEQUENCE IF NOT EXISTS patient_code_seq START 1`);

    await knex.schema.alterTable('patients', (t) => {
      t.string('patient_code', 20).nullable().unique();
    });

    // Back-fill existing patients in creation order
    // PostgreSQL does not support ORDER BY in UPDATE; use a subquery instead
    await knex.raw(`
      UPDATE patients
      SET patient_code = 'SF-' || LPAD(nextval('patient_code_seq')::text, 5, '0')
      WHERE patient_code IS NULL
    `);

    // Make it NOT NULL now that all rows have a value
    await knex.schema.alterTable('patients', (t) => {
      t.string('patient_code', 20).notNullable().defaultTo('').alter();
    });

    // Attach the default so new inserts auto-generate a code
    await knex.raw(`
      ALTER TABLE patients
        ALTER COLUMN patient_code
        SET DEFAULT 'SF-' || LPAD(nextval('patient_code_seq')::text, 5, '0')
    `);
  }
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  const hasChair = await knex.schema.hasColumn('appointments', 'chair_number');
  const hasTreatment = await knex.schema.hasColumn('appointments', 'treatment_name');

  await knex.schema.alterTable('appointments', (t) => {
    if (hasChair)     t.dropColumn('chair_number');
    if (hasTreatment) t.dropColumn('treatment_name');
  });

  const hasCode = await knex.schema.hasColumn('patients', 'patient_code');
  if (hasCode) {
    await knex.schema.alterTable('patients', (t) => {
      t.dropColumn('patient_code');
    });
    await knex.raw(`DROP SEQUENCE IF EXISTS patient_code_seq`);
  }
}
