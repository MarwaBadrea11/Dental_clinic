/**
 * Migration: Create license_info table for product licensing system
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.raw(`
    CREATE TYPE "LicenseStatus" AS ENUM (
      'PENDING',
      'ACTIVE', 
      'REVOKED',
      'EXPIRED'
    )
  `);

  await knex.schema.createTable('license_info', (t) => {
    t.increments('id').primary();
    t.text('license_key').nullable();
    t.timestamp('activated_at', { useTz: true }).nullable();
    t.timestamp('last_verified_at', { useTz: true }).nullable();
    t.specificType('status', '"LicenseStatus"').notNullable().defaultTo('PENDING');
    t.text('server_id').nullable(); // Unique identifier for this installation
    t.text('customer_name').nullable();
    t.text('customer_email').nullable();
    t.integer('max_users').nullable();
    t.date('expires_at').nullable();
    t.jsonb('metadata').nullable().defaultTo('{}');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index(['license_key']);
    t.index(['status']);
    t.index(['activated_at']);
    t.unique(['server_id']);
  });

  // Create updated_at trigger
  await knex.raw(`
    CREATE TRIGGER trg_license_info_updated_at
    BEFORE UPDATE ON license_info
    FOR EACH ROW EXECUTE FUNCTION set_updated_at()
  `);

  // Insert initial PENDING record
  await knex('license_info').insert({
    server_id: knex.raw('gen_random_uuid()'),
    status: 'PENDING'
  });
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.raw('DROP TRIGGER IF EXISTS trg_license_info_updated_at ON license_info');
  await knex.schema.dropTableIfExists('license_info');
  await knex.raw('DROP TYPE IF EXISTS "LicenseStatus"');
}