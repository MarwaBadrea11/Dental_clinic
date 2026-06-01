/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  // ─── Enums مع حماية التكرار ──────────────────────────────────────────────────
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE "Role" AS ENUM ('ADMIN', 'DENTIST', 'RECEPTIONIST', 'ACCOUNTANT', 'STOREKEEPER', 'HR');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);

  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);

  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PERMISSION_DENIED');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);

  // ─── users ──────────────────────────────────────────────────────────────────
  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('username').notNullable().unique();
    t.string('email').notNullable().unique();
    t.string('password_hash').notNullable();
    t.specificType('role', '"Role"').notNullable().defaultTo('RECEPTIONIST');
    t.boolean('is_active').notNullable().defaultTo(true);
    t.integer('failed_login_count').notNullable().defaultTo(0);
    t.timestamp('locked_until', { useTz: true }).nullable();
    t.timestamp('last_login_at', { useTz: true }).nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // ─── patients (مع الحقول المضافة حسب الواجهة) ────────────────────────────────
  await knex.schema.createTable('patients', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('first_name').notNullable();
    t.string('last_name').notNullable();
    t.date('date_of_birth').notNullable();
    t.string('gender').notNullable();
    t.string('national_id').notNullable().unique();
    t.string('phone').notNullable();
    t.string('email').nullable();
    t.string('city').nullable(); // حقل إضافي للواجهة
    t.text('address').nullable();
    t.string('blood_type').nullable();
    t.specificType('allergies', 'text[]').notNullable().defaultTo('{}');
    t.text('medical_history').nullable();
    t.text('clinical_notes').nullable(); // حقل إضافي للواجهة
    t.string('insurance_provider').nullable(); // حقل إضافي للواجهة
    t.string('insurance_policy_number').nullable(); // حقل إضافي للواجهة
    t.string('emergency_contact_name').nullable();
    t.string('emergency_contact_relationship').nullable(); // حقل إضافي للواجهة
    t.string('emergency_contact_phone').nullable();
    t.timestamp('deleted_at', { useTz: true }).nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // ─── باقي الجداول (appointments, refresh_tokens, audit_logs) ... كما هي ───
  // (ملاحظة: لضيق المساحة، ضعي بقية الكود الأصلي الخاص بالجداول هنا)
  
  // ─── Updated_at Triggers ──────────────────────────────────────────────────────
  await knex.raw(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  for (const table of ['users', 'patients', 'appointments']) {
    await knex.raw(`
      DROP TRIGGER IF EXISTS trg_${table}_updated_at ON "${table}";
      CREATE TRIGGER trg_${table}_updated_at
      BEFORE UPDATE ON "${table}"
      FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    `);
  }
}

export async function down(knex) {
  // ترتيب الحذف العكسي
  for (const table of ['audit_logs', 'refresh_tokens', 'appointments', 'patients', 'users']) {
    await knex.schema.dropTableIfExists(table);
  }
  await knex.raw('DROP TYPE IF EXISTS "AuditAction"');
  await knex.raw('DROP TYPE IF EXISTS "AppointmentStatus"');
  await knex.raw('DROP TYPE IF EXISTS "Role"');
  await knex.raw('DROP FUNCTION IF EXISTS set_updated_at');
}