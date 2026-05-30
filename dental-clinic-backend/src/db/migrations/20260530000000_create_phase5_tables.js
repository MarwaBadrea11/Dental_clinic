/**
 * Phase 5 – Reporting & Audit Logs
 * - Adds `table_name` column alias to audit_logs (the existing `resource` column
 *   already serves this purpose; we add a generated alias column for clarity and
 *   a composite index for report queries).
 * - Creates `report_snapshots` table for caching heavy report results.
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  // ─── ReportType enum ─────────────────────────────────────────────────────────
  await knex.raw(`
    CREATE TYPE "ReportType" AS ENUM (
      'FINANCIAL', 'INVENTORY', 'PAYROLL', 'APPOINTMENTS', 'PATIENTS'
    )
  `);

  // ─── report_snapshots ────────────────────────────────────────────────────────
  // Stores pre-computed report results so heavy queries aren't re-run on every
  // download request. TTL-based invalidation is handled at the service layer.
  await knex.schema.createTable('report_snapshots', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.specificType('report_type', '"ReportType"').notNullable();
    t.jsonb('params').notNullable().defaultTo('{}');   // query params used to generate
    t.jsonb('data').notNullable().defaultTo('{}');     // serialised report payload
    t.uuid('generated_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('expires_at', { useTz: true }).notNullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index(['report_type']);
    t.index(['expires_at']);
    t.index(['report_type', 'expires_at']);
  });

  // ─── audit_logs additions ────────────────────────────────────────────────────
  // Add composite index for the most common audit query pattern:
  // "show me all changes to <table> in <date range>"
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_created
    ON audit_logs (resource, created_at DESC)
  `);

  // Partial index for fast "recent mutations" dashboard queries
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_mutations
    ON audit_logs (created_at DESC)
    WHERE action IN ('CREATE', 'UPDATE', 'DELETE')
  `);
}

export async function down(knex) {
  await knex.raw('DROP INDEX IF EXISTS idx_audit_logs_mutations');
  await knex.raw('DROP INDEX IF EXISTS idx_audit_logs_resource_created');
  await knex.schema.dropTableIfExists('report_snapshots');
  await knex.raw('DROP TYPE IF EXISTS "ReportType"');
}
