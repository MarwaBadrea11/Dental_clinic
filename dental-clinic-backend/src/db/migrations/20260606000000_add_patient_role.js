/**
 * Migration: Add PATIENT to the Role enum and create patient_self_registrations
 * helper view (not a table — just enum extension).
 *
 * Steps:
 *  1. Add 'PATIENT' value to the existing "Role" enum.
 *  2. No table changes needed — the patients table already exists and is
 *     linked via email in the /patients/me endpoint.
 *
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  // PostgreSQL requires ALTER TYPE to add enum values.
  // IF NOT EXISTS guard makes the migration re-runnable safely.
  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'PATIENT'
          AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'Role'
          )
      ) THEN
        ALTER TYPE "Role" ADD VALUE 'PATIENT';
      END IF;
    END
    $$;
  `);
}

/**
 * NOTE: PostgreSQL does not support removing enum values once added.
 * The down migration is a no-op — removing the enum value would require
 * recreating the type, which is destructive and out of scope here.
 *
 * @param {import('knex').Knex} knex
 */
export async function down(_knex) {
  // Intentional no-op — see note above.
}
