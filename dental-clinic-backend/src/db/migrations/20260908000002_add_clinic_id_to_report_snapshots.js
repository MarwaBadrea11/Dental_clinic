/**
 * TX-06: Add clinic_id to report_snapshots (report cache table)
 *
 * CRITICAL FIX: report_snapshots caches report output keyed only by
 * (report_type, params) - with no clinic scoping at all. Once financialSummary()
 * became clinic-filtered, this cache would still serve Clinic A's cached
 * financial report to Clinic B on a cache hit with the same params,
 * silently defeating the isolation fix.
 *
 * This is cache data, not source-of-truth data, so unlike other TX-06
 * migrations there is no backfill/NOT NULL step: old unscoped rows are
 * simply left with clinic_id = NULL. They will never match a real clinicId
 * lookup again (WHERE clinic_id = <uuid> excludes NULL rows) and expire
 * naturally via their existing 30-minute TTL.
 *
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.schema.alterTable('report_snapshots', (t) => {
    t.uuid('clinic_id')
      .nullable()
      .references('id')
      .inTable('clinics')
      .onDelete('CASCADE');
    t.index(['clinic_id', 'report_type']);
  });
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.alterTable('report_snapshots', (t) => {
    t.dropColumn('clinic_id');
  });
}
