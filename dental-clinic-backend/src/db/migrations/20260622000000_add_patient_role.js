/**
 * Add PATIENT to the Role enum so the mobile self-registration flow works.
 * PostgreSQL requires ALTER TYPE ... ADD VALUE for enum additions.
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  // ADD VALUE is idempotent when using IF NOT EXISTS (Postgres 9.6+)
  await knex.raw(`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'PATIENT'`);
}

export async function down(knex) {
  // PostgreSQL does not support removing enum values without recreating the type.
  // This migration is intentionally irreversible.
}
