/**
 * Migration: Create clinics table
 * 
 * Part of TX-01: Multi-tenancy pilot on patients module
 * 
 * Creates the clinics table with minimal fields needed for clinic isolation.
 * This is the first step before adding clinic_id to patients.
 * 
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  // Create clinics table
  await knex.schema.createTable('clinics', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name', 255).notNullable();
    t.string('slug', 100).notNullable().unique();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    t.index(['slug']);
  });
  
  // Add updated_at trigger
  await knex.raw(`
    CREATE TRIGGER set_updated_at_clinics
    BEFORE UPDATE ON clinics
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('clinics');
}
