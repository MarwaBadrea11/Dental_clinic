/**
 * Migration: Reports Reconciliation & Infrastructure
 * ─────────────────────────────────────────────────────────────────────────────
 * Context
 * -------
 * The ReportsRepository (src/modules/reports/reports.repository.js) queries:
 *   - invoices, payments          → created in migration 20260529000000
 *   - inventory                   → created in migration 20260530000000 (phase4)
 *   - staff, salary_records       → created in migration 20260530000000 (phase4)
 *   - audit_logs, users           → created in migration 20260528000000
 *   - report_snapshots            → created in migration 20260530000000 (phase5)
 *
 * All base tables already exist and column names match the repository exactly.
 * No table renames or drops are needed.
 *
 * What this migration adds
 * ------------------------
 * 1. `inventory_summary_view`  — materialises the per-item stock-value calc so
 *    the inventory report query is a simple SELECT instead of inline arithmetic.
 *
 * 2. `payroll_summary_view`    — joins salary_records → staff so the payroll
 *    report has a stable, indexed view to query against.
 *
 * 3. `fn_expire_report_snapshots()` + triggers on inventory, salary_records,
 *    and invoices — automatically marks cached report_snapshots as expired
 *    (sets expires_at = NOW()) whenever source data is mutated, so stale
 *    reports are never served from cache.
 *
 * 4. Composite index on report_snapshots(report_type, params, expires_at) —
 *    speeds up the cache-lookup query in ReportsService._getCached().
 *
 * Safety
 * ------
 * - Zero existing tables are dropped or altered.
 * - All enums are left untouched.
 * - auditHook.js writes to audit_logs.resource / audit_logs.action — neither
 *   column is touched here.
 * - down() performs an exact, ordered rollback of everything up() creates.
 *
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {

  // ── 1. inventory_summary_view ──────────────────────────────────────────────
  // Exposes the same columns the repository selects, plus pre-computed flags.
  // The repository can keep querying `inventory` directly; this view is
  // available for future dashboard / reporting shortcuts.
  await knex.raw(`
    CREATE OR REPLACE VIEW inventory_summary_view AS
    SELECT
      id,
      material_name                                   AS name,
      category,
      quantity,
      unit,
      min_stock_alert                                 AS reorder_level,
      unit_price                                      AS unit_cost,
      expiry_date,
      supplier_info,
      (quantity * unit_price)::float                  AS stock_value,
      (quantity <= min_stock_alert)                   AS is_low_stock,
      (quantity = 0)                                  AS is_out_of_stock,
      (expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE) AS is_expired,
      (
        expiry_date IS NOT NULL
        AND expiry_date >= CURRENT_DATE
        AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'
      )                                               AS is_near_expiry,
      deleted_at,
      created_at,
      updated_at
    FROM inventory
    WHERE deleted_at IS NULL
  `);

  // ── 2. payroll_summary_view ────────────────────────────────────────────────
  // Joins salary_records with staff so payroll reports don't need an explicit
  // JOIN in every query. Mirrors the columns the repository already selects.
  await knex.raw(`
    CREATE OR REPLACE VIEW payroll_summary_view AS
    SELECT
      sr.id,
      sr.staff_id,
      s.full_name,
      s.email,
      s.role,
      s.status                                        AS staff_status,
      sr.base_salary,
      sr.bonus                                        AS bonuses,
      sr.deductions,
      (sr.base_salary + sr.bonus - sr.deductions)::float AS net_salary,
      sr.month,
      sr.year,
      sr.notes,
      sr.created_at
    FROM salary_records sr
    JOIN staff s ON sr.staff_id = s.id
    WHERE s.deleted_at IS NULL
  `);

  // ── 3. Cache-invalidation trigger function ─────────────────────────────────
  // Called by triggers on inventory, salary_records, and invoices.
  // Marks any non-expired snapshot of the affected report type as expired
  // immediately so the next request regenerates fresh data.
  await knex.raw(`
    CREATE OR REPLACE FUNCTION fn_expire_report_snapshots()
    RETURNS TRIGGER AS $$
    DECLARE
      v_report_type "ReportType";
    BEGIN
      -- Map the mutated table to its report type
      CASE TG_TABLE_NAME
        WHEN 'inventory'       THEN v_report_type := 'INVENTORY';
        WHEN 'salary_records'  THEN v_report_type := 'PAYROLL';
        WHEN 'invoices'        THEN v_report_type := 'FINANCIAL';
        WHEN 'payments'        THEN v_report_type := 'FINANCIAL';
        ELSE RETURN NEW;
      END CASE;

      UPDATE report_snapshots
        SET expires_at = NOW()
      WHERE report_type = v_report_type
        AND expires_at  > NOW();

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  // Attach the trigger to each source table (INSERT / UPDATE / DELETE)
  for (const table of ['inventory', 'salary_records', 'invoices', 'payments']) {
    await knex.raw(`
      CREATE TRIGGER trg_${table}_expire_report_cache
      AFTER INSERT OR UPDATE OR DELETE ON "${table}"
      FOR EACH STATEMENT EXECUTE FUNCTION fn_expire_report_snapshots()
    `);
  }

  // ── 4. Composite index for cache-lookup query ──────────────────────────────
  // Speeds up: WHERE report_type = ? AND expires_at > NOW()
  // Note: partial index predicates cannot use NOW() (not immutable in PG),
  // so we index all rows and let the query planner filter by expires_at.
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_report_snapshots_lookup
    ON report_snapshots (report_type, expires_at DESC)
  `);
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  // Remove in reverse order of creation

  // 4. Composite index
  await knex.raw('DROP INDEX IF EXISTS idx_report_snapshots_lookup');

  // 3. Cache-invalidation triggers and function
  for (const table of ['payments', 'invoices', 'salary_records', 'inventory']) {
    await knex.raw(`DROP TRIGGER IF EXISTS trg_${table}_expire_report_cache ON "${table}"`);
  }
  await knex.raw('DROP FUNCTION IF EXISTS fn_expire_report_snapshots()');

  // 2. Views
  await knex.raw('DROP VIEW IF EXISTS payroll_summary_view');
  await knex.raw('DROP VIEW IF EXISTS inventory_summary_view');
}
