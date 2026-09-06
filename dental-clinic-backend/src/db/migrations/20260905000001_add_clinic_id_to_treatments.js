/**
 * TX-04: Add clinic_id to procedure_catalog, treatment_plans, treatment_procedures
 * Pattern: nullable → backfill → NOT NULL → FK → indexes
 * Execution order respects dependencies: catalog → plans → procedures
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  // ────────────────────────────────────────────────────────────────────────────
  // STEP 1: procedure_catalog — Add nullable clinic_id
  // ────────────────────────────────────────────────────────────────────────────
  await knex.schema.alterTable('procedure_catalog', (t) => {
    t.uuid('clinic_id').nullable();
  });

  // Backfill: All existing procedures belong to default clinic
  await knex.raw(`
    UPDATE procedure_catalog
    SET clinic_id = (SELECT id FROM clinics WHERE name = 'SmileFix Main Clinic' LIMIT 1)
    WHERE clinic_id IS NULL
  `);

  // Make NOT NULL and add FK
  await knex.schema.alterTable('procedure_catalog', (t) => {
    t.uuid('clinic_id').notNullable().alter();
    t.foreign('clinic_id').references('id').inTable('clinics').onDelete('RESTRICT').onUpdate('CASCADE');
  });

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 2: treatment_plans — Add nullable clinic_id
  // ────────────────────────────────────────────────────────────────────────────
  await knex.schema.alterTable('treatment_plans', (t) => {
    t.uuid('clinic_id').nullable();
  });

  // Backfill: Inherit clinic_id from patient
  await knex.raw(`
    UPDATE treatment_plans tp
    SET clinic_id = p.clinic_id
    FROM patients p
    WHERE tp.patient_id = p.id AND tp.clinic_id IS NULL
  `);

  // Make NOT NULL and add FK
  await knex.schema.alterTable('treatment_plans', (t) => {
    t.uuid('clinic_id').notNullable().alter();
    t.foreign('clinic_id').references('id').inTable('clinics').onDelete('RESTRICT').onUpdate('CASCADE');
  });

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 3: treatment_procedures — Add nullable clinic_id
  // ────────────────────────────────────────────────────────────────────────────
  await knex.schema.alterTable('treatment_procedures', (t) => {
    t.uuid('clinic_id').nullable();
  });

  // Backfill: Inherit clinic_id from treatment_plan
  await knex.raw(`
    UPDATE treatment_procedures tpr
    SET clinic_id = tp.clinic_id
    FROM treatment_plans tp
    WHERE tpr.treatment_plan_id = tp.id AND tpr.clinic_id IS NULL
  `);

  // Make NOT NULL and add FK
  await knex.schema.alterTable('treatment_procedures', (t) => {
    t.uuid('clinic_id').notNullable().alter();
    t.foreign('clinic_id').references('id').inTable('clinics').onDelete('RESTRICT').onUpdate('CASCADE');
  });

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 4: Add indexes for clinic-scoped queries
  // ────────────────────────────────────────────────────────────────────────────
  await knex.schema.alterTable('procedure_catalog', (t) => {
    t.index(['clinic_id']);
    t.index(['clinic_id', 'code']); // Unique code per clinic (not globally unique)
    t.index(['clinic_id', 'is_active']);
  });

  await knex.schema.alterTable('treatment_plans', (t) => {
    t.index(['clinic_id']);
    t.index(['clinic_id', 'patient_id']);
    t.index(['clinic_id', 'dentist_id']);
    t.index(['clinic_id', 'status']);
  });

  await knex.schema.alterTable('treatment_procedures', (t) => {
    t.index(['clinic_id']);
    t.index(['clinic_id', 'treatment_plan_id']);
  });
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  // Drop indexes
  await knex.schema.alterTable('treatment_procedures', (t) => {
    t.dropIndex(['clinic_id', 'treatment_plan_id']);
    t.dropIndex(['clinic_id']);
  });

  await knex.schema.alterTable('treatment_plans', (t) => {
    t.dropIndex(['clinic_id', 'status']);
    t.dropIndex(['clinic_id', 'dentist_id']);
    t.dropIndex(['clinic_id', 'patient_id']);
    t.dropIndex(['clinic_id']);
  });

  await knex.schema.alterTable('procedure_catalog', (t) => {
    t.dropIndex(['clinic_id', 'is_active']);
    t.dropIndex(['clinic_id', 'code']);
    t.dropIndex(['clinic_id']);
  });

  // Drop FKs and columns (reverse order)
  await knex.schema.alterTable('treatment_procedures', (t) => {
    t.dropForeign(['clinic_id']);
    t.dropColumn('clinic_id');
  });

  await knex.schema.alterTable('treatment_plans', (t) => {
    t.dropForeign(['clinic_id']);
    t.dropColumn('clinic_id');
  });

  await knex.schema.alterTable('procedure_catalog', (t) => {
    t.dropForeign(['clinic_id']);
    t.dropColumn('clinic_id');
  });
}
