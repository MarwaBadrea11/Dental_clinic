/**
 * Singleton clinic information record for the Settings page.
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  const exists = await knex.schema.hasTable('clinic_info');
  if (exists) return;

  await knex.schema.createTable('clinic_info', (t) => {
    t.integer('id').primary().defaultTo(1);
    t.string('name').nullable();
    t.string('phone').nullable();
    t.string('email').nullable();
    t.string('website').nullable();
    t.text('address').nullable();
    t.string('city').nullable();
    t.string('tax_id').nullable();
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex('clinic_info').insert({
    id: 1,
    name: 'SmileFix Dental Clinic',
    phone: '+1 (800) SMILEFIX',
    email: 'info@smilefix.com',
    website: 'www.smilefix.com',
    address: '500 Medical Center Drive',
    city: 'Los Angeles, CA 90001',
    tax_id: 'TAX-88421',
  });
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('clinic_info');
}
