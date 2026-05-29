/**
 * Phase 3: Treatments & Financials
 * Tables: procedure_catalog, treatment_plans, treatment_procedures,
 *         odontogram, odontogram_history, medical_images, invoices, payments
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  // ─── Enums ──────────────────────────────────────────────────────────────────
  await knex.raw(`CREATE TYPE "TreatmentStatus" AS ENUM ('DRAFT','ACTIVE','COMPLETED','CANCELLED')`);
  await knex.raw(`CREATE TYPE "ProcedureStatus" AS ENUM ('PENDING','DONE','SKIPPED')`);
  await knex.raw(`CREATE TYPE "ToothStatus"     AS ENUM ('HEALTHY','DECAYED','FILLED','MISSING','CROWNED','IMPLANT','BRIDGE')`);
  await knex.raw(`CREATE TYPE "InvoiceStatus"   AS ENUM ('DRAFT','ISSUED','PARTIALLY_PAID','PAID','OVERDUE','CANCELLED')`);
  await knex.raw(`CREATE TYPE "PaymentMethod"   AS ENUM ('CASH','CARD','BANK_TRANSFER','INSURANCE')`);

  // ─── procedure_catalog ──────────────────────────────────────────────────────
  await knex.schema.createTable('procedure_catalog', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('code').notNullable().unique();
    t.string('name').notNullable();
    t.text('description').nullable();
    t.decimal('default_cost', 10, 2).notNullable().defaultTo(0);
    t.string('category').nullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index(['code']);
    t.index(['category']);
  });

  // ─── treatment_plans ────────────────────────────────────────────────────────
  await knex.schema.createTable('treatment_plans', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('patient_id').notNullable().references('id').inTable('patients').onDelete('RESTRICT').onUpdate('CASCADE');
    t.uuid('dentist_id').notNullable().references('id').inTable('users').onDelete('RESTRICT').onUpdate('CASCADE');
    t.uuid('appointment_id').nullable().references('id').inTable('appointments').onDelete('SET NULL').onUpdate('CASCADE');
    t.string('title').notNullable();
    t.text('description').nullable();
    t.specificType('status', '"TreatmentStatus"').notNullable().defaultTo('DRAFT');
    t.decimal('estimated_cost', 10, 2).nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index(['patient_id']);
    t.index(['dentist_id']);
    t.index(['status']);
    t.index(['patient_id', 'status']);
  });

  // ─── treatment_procedures ───────────────────────────────────────────────────
  await knex.schema.createTable('treatment_procedures', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('treatment_plan_id').notNullable().references('id').inTable('treatment_plans').onDelete('CASCADE').onUpdate('CASCADE');
    t.uuid('procedure_id').notNullable().references('id').inTable('procedure_catalog').onDelete('RESTRICT').onUpdate('CASCADE');
    t.string('tooth_number', 3).nullable();
    t.smallint('quantity').notNullable().defaultTo(1);
    t.decimal('unit_cost', 10, 2).notNullable();
    t.specificType('status', '"ProcedureStatus"').notNullable().defaultTo('PENDING');
    t.text('notes').nullable();
    t.timestamp('performed_at', { useTz: true }).nullable();
    t.uuid('performed_by').nullable().references('id').inTable('users').onDelete('SET NULL').onUpdate('CASCADE');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index(['treatment_plan_id']);
    t.index(['procedure_id']);
  });

  // ─── odontogram ─────────────────────────────────────────────────────────────
  await knex.schema.createTable('odontogram', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('patient_id').notNullable().references('id').inTable('patients').onDelete('CASCADE').onUpdate('CASCADE').unique();
    t.jsonb('teeth').notNullable().defaultTo('{}');
    t.uuid('last_updated_by').nullable().references('id').inTable('users').onDelete('SET NULL').onUpdate('CASCADE');
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index(['patient_id']);
  });

  // ─── odontogram_history ─────────────────────────────────────────────────────
  await knex.schema.createTable('odontogram_history', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('patient_id').notNullable().references('id').inTable('patients').onDelete('CASCADE').onUpdate('CASCADE');
    t.string('tooth_number', 3).notNullable();
    t.jsonb('previous_state').notNullable();
    t.jsonb('new_state').notNullable();
    t.uuid('changed_by').nullable().references('id').inTable('users').onDelete('SET NULL').onUpdate('CASCADE');
    t.uuid('treatment_plan_id').nullable().references('id').inTable('treatment_plans').onDelete('SET NULL').onUpdate('CASCADE');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index(['patient_id']);
    t.index(['patient_id', 'tooth_number']);
    t.index(['created_at']);
  });

  // ─── medical_images ─────────────────────────────────────────────────────────
  await knex.schema.createTable('medical_images', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('patient_id').notNullable().references('id').inTable('patients').onDelete('CASCADE').onUpdate('CASCADE');
    t.uuid('treatment_plan_id').nullable().references('id').inTable('treatment_plans').onDelete('SET NULL').onUpdate('CASCADE');
    t.uuid('appointment_id').nullable().references('id').inTable('appointments').onDelete('SET NULL').onUpdate('CASCADE');
    t.string('tooth_number', 3).nullable();
    t.string('type').notNullable();          // XRAY | PHOTO | SCAN | DOCUMENT
    t.string('file_name').notNullable();
    t.string('storage_key').notNullable();   // S3 key / local path
    t.string('mime_type').notNullable();
    t.integer('file_size_bytes').nullable();
    t.uuid('uploaded_by').nullable().references('id').inTable('users').onDelete('SET NULL').onUpdate('CASCADE');
    t.text('notes').nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index(['patient_id']);
    t.index(['treatment_plan_id']);
    t.index(['appointment_id']);
  });

  // ─── invoices ───────────────────────────────────────────────────────────────
  await knex.schema.createTable('invoices', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('patient_id').notNullable().references('id').inTable('patients').onDelete('RESTRICT').onUpdate('CASCADE');
    t.uuid('appointment_id').nullable().references('id').inTable('appointments').onDelete('SET NULL').onUpdate('CASCADE');
    t.uuid('treatment_plan_id').nullable().references('id').inTable('treatment_plans').onDelete('SET NULL').onUpdate('CASCADE');
    t.jsonb('line_items').notNullable().defaultTo('[]');
    t.decimal('subtotal', 10, 2).notNullable().defaultTo(0);
    t.decimal('tax_rate', 5, 4).notNullable().defaultTo(0);
    t.decimal('tax_amount', 10, 2).notNullable().defaultTo(0);
    t.decimal('total_amount', 10, 2).notNullable().defaultTo(0);
    t.decimal('amount_paid', 10, 2).notNullable().defaultTo(0);
    t.specificType('status', '"InvoiceStatus"').notNullable().defaultTo('DRAFT');
    t.date('due_date').nullable();
    t.timestamp('issued_at', { useTz: true }).nullable();
    t.uuid('issued_by').nullable().references('id').inTable('users').onDelete('SET NULL').onUpdate('CASCADE');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index(['patient_id']);
    t.index(['status']);
    t.index(['due_date']);
    t.index(['patient_id', 'status']);
  });

  // ─── payments ───────────────────────────────────────────────────────────────
  await knex.schema.createTable('payments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('invoice_id').notNullable().references('id').inTable('invoices').onDelete('RESTRICT').onUpdate('CASCADE');
    t.decimal('amount', 10, 2).notNullable();
    t.specificType('method', '"PaymentMethod"').notNullable();
    t.string('reference').nullable();
    t.text('notes').nullable();
    t.timestamp('paid_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.uuid('recorded_by').nullable().references('id').inTable('users').onDelete('SET NULL').onUpdate('CASCADE');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index(['invoice_id']);
    t.index(['paid_at']);
  });

  // ─── updated_at triggers ────────────────────────────────────────────────────
  for (const table of ['procedure_catalog', 'treatment_plans', 'treatment_procedures', 'invoices']) {
    await knex.raw(`
      CREATE TRIGGER trg_${table}_updated_at
      BEFORE UPDATE ON "${table}"
      FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    `);
  }
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  for (const table of ['payments', 'invoices', 'medical_images', 'odontogram_history', 'odontogram', 'treatment_procedures', 'treatment_plans', 'procedure_catalog']) {
    await knex.schema.dropTableIfExists(table);
  }

  await knex.raw('DROP TYPE IF EXISTS "PaymentMethod"');
  await knex.raw('DROP TYPE IF EXISTS "InvoiceStatus"');
  await knex.raw('DROP TYPE IF EXISTS "ToothStatus"');
  await knex.raw('DROP TYPE IF EXISTS "ProcedureStatus"');
  await knex.raw('DROP TYPE IF EXISTS "TreatmentStatus"');
}
