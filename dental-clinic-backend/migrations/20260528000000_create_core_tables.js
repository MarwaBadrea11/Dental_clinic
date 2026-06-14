/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  // ─── Enums ──────────────────────────────────────────────────────────────────
  await knex.raw(`
    CREATE TYPE "Role" AS ENUM (
      'ADMIN', 'DENTIST', 'RECEPTIONIST', 'ACCOUNTANT', 'STOREKEEPER', 'HR'
    )
  `);

  await knex.raw(`
    CREATE TYPE "AppointmentStatus" AS ENUM (
      'SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'
    )
  `);

  await knex.raw(`
    CREATE TYPE "AuditAction" AS ENUM (
      'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PERMISSION_DENIED'
    )
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

    t.index(['email']);
    t.index(['role']);
  });

  // ─── patients ────────────────────────────────────────────────────────────────
  await knex.schema.createTable('patients', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('first_name').notNullable();
    t.string('last_name').notNullable();
    t.date('date_of_birth').notNullable();
    t.string('gender').notNullable();
    t.string('national_id').notNullable().unique();
    t.string('phone').notNullable();
    t.string('email').nullable();
    t.text('address').nullable();
    t.string('blood_type').nullable();
    t.specificType('allergies', 'text[]').notNullable().defaultTo('{}');
    t.text('medical_history').nullable();
    t.string('emergency_contact_name').nullable();
    t.string('emergency_contact_phone').nullable();
    t.timestamp('deleted_at', { useTz: true }).nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index(['national_id']);
    t.index(['phone']);
    t.index(['email']);
    t.index(['first_name', 'last_name']);
    t.index(['created_at']);
  });

  // ─── appointments ────────────────────────────────────────────────────────────
  await knex.schema.createTable('appointments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('patient_id').notNullable().references('id').inTable('patients').onDelete('RESTRICT').onUpdate('CASCADE');
    t.uuid('dentist_id').notNullable().references('id').inTable('users').onDelete('RESTRICT').onUpdate('CASCADE');
    t.timestamp('scheduled_at', { useTz: true }).notNullable();
    t.integer('duration_minutes').notNullable();
    t.specificType('status', '"AppointmentStatus"').notNullable().defaultTo('SCHEDULED');
    t.text('notes').nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index(['patient_id']);
    t.index(['dentist_id']);
    t.index(['scheduled_at']);
    t.index(['dentist_id', 'scheduled_at']);
  });

  // ─── refresh_tokens ──────────────────────────────────────────────────────────
  await knex.schema.createTable('refresh_tokens', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE').onUpdate('CASCADE');
    t.string('token_hash').notNullable().unique();
    t.timestamp('expires_at', { useTz: true }).notNullable();
    t.timestamp('revoked_at', { useTz: true }).nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index(['user_id']);
    t.index(['token_hash']);
    t.index(['expires_at']);
  });

  // ─── audit_logs ──────────────────────────────────────────────────────────────
  await knex.schema.createTable('audit_logs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL').onUpdate('CASCADE');
    t.specificType('action', '"AuditAction"').notNullable();
    t.string('resource').notNullable();
    t.string('resource_id').nullable();
    t.jsonb('previous_value').nullable();
    t.jsonb('new_value').nullable();
    t.string('ip_address').nullable();
    t.string('user_agent').nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index(['user_id']);
    t.index(['resource', 'resource_id']);
    t.index(['action']);
    t.index(['created_at']);
  });

  // ─── updated_at trigger ──────────────────────────────────────────────────────
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
      CREATE TRIGGER trg_${table}_updated_at
      BEFORE UPDATE ON "${table}"
      FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    `);
  }
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  for (const table of ['audit_logs', 'refresh_tokens', 'appointments', 'patients', 'users']) {
    await knex.schema.dropTableIfExists(table);
  }

  await knex.raw('DROP TYPE IF EXISTS "AuditAction"');
  await knex.raw('DROP TYPE IF EXISTS "AppointmentStatus"');
  await knex.raw('DROP TYPE IF EXISTS "Role"');
  await knex.raw('DROP FUNCTION IF EXISTS set_updated_at');
}