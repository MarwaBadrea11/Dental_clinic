/**
 * TX-06: Add clinic_id to payments and payment_refunds tables
 *
 * Backfill source: the parent invoice's clinic_id (just added in the
 * previous migration), since every payment/refund already has an
 * invoice_id.
 *
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  console.log('TX-06: Adding clinic_id to payments...');

  const beforePayments = await knex('payments').count('* as count').first();

  await knex.schema.alterTable('payments', (t) => {
    t.uuid('clinic_id')
      .nullable()
      .references('id')
      .inTable('clinics')
      .onDelete('RESTRICT')
      .onUpdate('CASCADE');
    t.index(['clinic_id']);
  });

  const updatedPayments = await knex('payments')
    .whereNull('clinic_id')
    .update({
      clinic_id: knex('invoices')
        .select('clinic_id')
        .where('invoices.id', knex.raw('payments.invoice_id'))
        .limit(1),
    });
  console.log(`   Backfilled ${updatedPayments} payments from their invoice's clinic`);

  const nullPayments = await knex('payments').whereNull('clinic_id').count('* as count').first();
  if (parseInt(nullPayments.count) > 0) {
    throw new Error(`Backfill incomplete: ${nullPayments.count} payments still have NULL clinic_id.`);
  }

  const afterPayments = await knex('payments').count('* as count').first();
  if (beforePayments.count !== afterPayments.count) {
    throw new Error(`DATA LOSS DETECTED (payments): Before=${beforePayments.count}, After=${afterPayments.count}`);
  }

  await knex.schema.alterTable('payments', (t) => {
    t.uuid('clinic_id').notNullable().alter();
  });

  console.log('TX-06: Adding clinic_id to payment_refunds...');

  const beforeRefunds = await knex('payment_refunds').count('* as count').first();

  await knex.schema.alterTable('payment_refunds', (t) => {
    t.uuid('clinic_id')
      .nullable()
      .references('id')
      .inTable('clinics')
      .onDelete('RESTRICT')
      .onUpdate('CASCADE');
    t.index(['clinic_id']);
  });

  const updatedRefunds = await knex('payment_refunds')
    .whereNull('clinic_id')
    .update({
      clinic_id: knex('invoices')
        .select('clinic_id')
        .where('invoices.id', knex.raw('payment_refunds.invoice_id'))
        .limit(1),
    });
  console.log(`   Backfilled ${updatedRefunds} payment_refunds from their invoice's clinic`);

  const nullRefunds = await knex('payment_refunds').whereNull('clinic_id').count('* as count').first();
  if (parseInt(nullRefunds.count) > 0) {
    throw new Error(`Backfill incomplete: ${nullRefunds.count} payment_refunds still have NULL clinic_id.`);
  }

  const afterRefunds = await knex('payment_refunds').count('* as count').first();
  if (beforeRefunds.count !== afterRefunds.count) {
    throw new Error(`DATA LOSS DETECTED (payment_refunds): Before=${beforeRefunds.count}, After=${afterRefunds.count}`);
  }

  await knex.schema.alterTable('payment_refunds', (t) => {
    t.uuid('clinic_id').notNullable().alter();
  });

  console.log(`✓ TX-06 complete: ${afterPayments.count} payments + ${afterRefunds.count} refunds migrated (no data loss)`);
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.alterTable('payment_refunds', (t) => {
    t.dropColumn('clinic_id');
  });
  await knex.schema.alterTable('payments', (t) => {
    t.dropColumn('clinic_id');
  });
}
