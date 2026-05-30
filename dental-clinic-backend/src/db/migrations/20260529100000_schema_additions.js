/**
 * Phase 3 — Schema Additions
 * - invoice_number (human-readable, auto-generated on ISSUED)
 * - ImageType enum replacing plain string on medical_images.type
 * - created_at on odontogram
 * - payment_refunds table for void/refund tracking
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  // ─── ImageType enum ─────────────────────────────────────────────────────────
  await knex.raw(`CREATE TYPE "ImageType" AS ENUM ('XRAY', 'PHOTO', 'SCAN', 'DOCUMENT')`);

  await knex.raw(`
    ALTER TABLE medical_images
      ALTER COLUMN type TYPE "ImageType" USING type::"ImageType"
  `);

  // ─── invoice_number ──────────────────────────────────────────────────────────
  await knex.schema.alterTable('invoices', (t) => {
    t.string('invoice_number', 20).nullable().unique().after('id');
  });

  // Sequence for invoice numbers (INV-YYYY-NNNNNN)
  await knex.raw(`CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1`);

  // Trigger: auto-assign invoice_number when status transitions to ISSUED
  await knex.raw(`
    CREATE OR REPLACE FUNCTION assign_invoice_number()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.status = 'ISSUED' AND OLD.status = 'DRAFT' AND NEW.invoice_number IS NULL THEN
        NEW.invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('invoice_number_seq')::TEXT, 6, '0');
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await knex.raw(`
    CREATE TRIGGER trg_invoices_assign_number
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION assign_invoice_number()
  `);

  // ─── odontogram created_at ───────────────────────────────────────────────────
  await knex.schema.alterTable('odontogram', (t) => {
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // ─── payment_refunds ─────────────────────────────────────────────────────────
  // Tracks voided/refunded payments without deleting the original record
  await knex.schema.createTable('payment_refunds', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('payment_id').notNullable().references('id').inTable('payments').onDelete('RESTRICT').onUpdate('CASCADE');
    t.uuid('invoice_id').notNullable().references('id').inTable('invoices').onDelete('RESTRICT').onUpdate('CASCADE');
    t.decimal('amount', 10, 2).notNullable();
    t.text('reason').notNullable();
    t.uuid('refunded_by').nullable().references('id').inTable('users').onDelete('SET NULL').onUpdate('CASCADE');
    t.timestamp('refunded_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index(['payment_id']);
    t.index(['invoice_id']);
  });
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('payment_refunds');

  await knex.raw(`DROP TRIGGER IF EXISTS trg_invoices_assign_number ON invoices`);
  await knex.raw(`DROP FUNCTION IF EXISTS assign_invoice_number`);
  await knex.raw(`DROP SEQUENCE IF EXISTS invoice_number_seq`);

  await knex.schema.alterTable('invoices', (t) => {
    t.dropColumn('invoice_number');
  });

  await knex.schema.alterTable('odontogram', (t) => {
    t.dropColumn('created_at');
  });

  await knex.raw(`
    ALTER TABLE medical_images
      ALTER COLUMN type TYPE VARCHAR USING type::TEXT
  `);

  await knex.raw(`DROP TYPE IF EXISTS "ImageType"`);
}
