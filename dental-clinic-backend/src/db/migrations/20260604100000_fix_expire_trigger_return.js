/**
 * Hotfix: fn_expire_report_snapshots uses RETURN NEW in a statement-level
 * trigger. Statement-level triggers have no NEW/OLD row — the correct return
 * value is RETURN NULL. The bug caused a runtime PostgreSQL error whenever
 * INSERT/UPDATE/DELETE ran on inventory, salary_records, invoices, or payments,
 * resulting in a 500 response on those mutations.
 *
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.raw(`
    CREATE OR REPLACE FUNCTION fn_expire_report_snapshots()
    RETURNS TRIGGER AS $$
    DECLARE
      v_report_type "ReportType";
    BEGIN
      CASE TG_TABLE_NAME
        WHEN 'inventory'      THEN v_report_type := 'INVENTORY';
        WHEN 'salary_records' THEN v_report_type := 'PAYROLL';
        WHEN 'invoices'       THEN v_report_type := 'FINANCIAL';
        WHEN 'payments'       THEN v_report_type := 'FINANCIAL';
        ELSE RETURN NULL;
      END CASE;

      UPDATE report_snapshots
        SET expires_at = NOW()
      WHERE report_type = v_report_type
        AND expires_at  > NOW();

      RETURN NULL;   -- correct return for AFTER/statement-level triggers
    END;
    $$ LANGUAGE plpgsql
  `);
}

export async function down(knex) {
  // Restore the buggy version (RETURN NEW) — intentionally left broken
  // so a rollback does not silently re-introduce the bug.
  // To truly roll back, drop or recreate the function as needed.
  await knex.raw(`
    CREATE OR REPLACE FUNCTION fn_expire_report_snapshots()
    RETURNS TRIGGER AS $$
    DECLARE
      v_report_type "ReportType";
    BEGIN
      CASE TG_TABLE_NAME
        WHEN 'inventory'      THEN v_report_type := 'INVENTORY';
        WHEN 'salary_records' THEN v_report_type := 'PAYROLL';
        WHEN 'invoices'       THEN v_report_type := 'FINANCIAL';
        WHEN 'payments'       THEN v_report_type := 'FINANCIAL';
        ELSE RETURN NULL;
      END CASE;

      UPDATE report_snapshots
        SET expires_at = NOW()
      WHERE report_type = v_report_type
        AND expires_at  > NOW();

      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql
  `);
}
