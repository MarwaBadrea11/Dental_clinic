/**
 * Migration: Add hardware binding information to license_info table
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.schema.alterTable('license_info', (t) => {
    t.text('hardware_fingerprint').nullable();
    t.text('hardware_machine_id').nullable();
    t.boolean('is_hardware_bound').defaultTo(false);
    t.jsonb('hardware_info').nullable().defaultTo('{}');
    
    t.index(['hardware_fingerprint']);
    t.index(['is_hardware_bound']);
  });

  console.log('✅ Added hardware binding columns to license_info table');
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.alterTable('license_info', (t) => {
    t.dropColumn('hardware_fingerprint');
    t.dropColumn('hardware_machine_id');
    t.dropColumn('is_hardware_bound');
    t.dropColumn('hardware_info');
  });

  console.log('✅ Removed hardware binding columns from license_info table');
}