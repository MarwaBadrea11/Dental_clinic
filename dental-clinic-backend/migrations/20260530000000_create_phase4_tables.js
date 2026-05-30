/**
 * Phase 4: Inventory & Staff Management
 * Tables: inventory, staff, attendance_logs, salary_records
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  // ─── Enums ──────────────────────────────────────────────────────────────────
  await knex.raw(`
    CREATE TYPE "InventoryCategory" AS ENUM (
      'Consumables', 'Instruments', 'Medications', 'Protective Equipment',
      'Impression Materials', 'Restorative', 'Sterilization', 'Equipment'
    )
  `);

  await knex.raw(`
    CREATE TYPE "StaffRole" AS ENUM (
      'doctor', 'receptionist', 'nurse', 'hygienist', 'assistant', 'admin', 'manager'
    )
  `);

  await knex.raw(`
    CREATE TYPE "StaffStatus" AS ENUM ('active', 'inactive', 'on-leave')
  `);

  await knex.raw(`
    CREATE TYPE "AttendanceStatus" AS ENUM ('present', 'absent', 'late', 'half-day', 'leave')
  `);

  // ─── inventory ──────────────────────────────────────────────────────────────
  await knex.schema.createTable('inventory', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('material_name').notNullable();
    t.specificType('category', '"InventoryCategory"').notNullable().defaultTo('Consumables');
    t.integer('quantity').notNullable().defaultTo(0);
    t.string('unit').notNullable().defaultTo('piece');
    t.integer('min_stock_alert').notNullable().defaultTo(5);
    t.date('expiry_date').nullable();
    t.decimal('unit_price', 10, 2).notNullable().defaultTo(0);
    t.text('supplier_info').nullable();
    t.timestamp('deleted_at', { useTz: true }).nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index(['category']);
    t.index(['quantity']);
    t.index(['expiry_date']);
    t.index(['material_name']);
  });

  // ─── staff ──────────────────────────────────────────────────────────────────
  await knex.schema.createTable('staff', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('full_name').notNullable();
    t.specificType('role', '"StaffRole"').notNullable().defaultTo('receptionist');
    t.string('phone').notNullable();
    t.string('email').notNullable().unique();
    t.time('shift_start').nullable();
    t.time('shift_end').nullable();
    t.decimal('base_salary', 10, 2).notNullable().defaultTo(0);
    t.specificType('status', '"StaffStatus"').notNullable().defaultTo('active');
    t.timestamp('deleted_at', { useTz: true }).nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index(['role']);
    t.index(['status']);
    t.index(['email']);
  });

  // ─── attendance_logs ─────────────────────────────────────────────────────────
  await knex.schema.createTable('attendance_logs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('staff_id').notNullable().references('id').inTable('staff').onDelete('CASCADE').onUpdate('CASCADE');
    t.date('log_date').notNullable();
    t.time('check_in').nullable();
    t.time('check_out').nullable();
    t.specificType('status', '"AttendanceStatus"').notNullable().defaultTo('present');
    t.text('notes').nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.unique(['staff_id', 'log_date']);
    t.index(['staff_id']);
    t.index(['log_date']);
    t.index(['status']);
  });

  // ─── salary_records ──────────────────────────────────────────────────────────
  await knex.schema.createTable('salary_records', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('staff_id').notNullable().references('id').inTable('staff').onDelete('CASCADE').onUpdate('CASCADE');
    t.integer('month').notNullable();   // 1–12
    t.integer('year').notNullable();
    t.decimal('base_salary', 10, 2).notNullable();
    t.decimal('bonus', 10, 2).notNullable().defaultTo(0);
    t.decimal('deductions', 10, 2).notNullable().defaultTo(0);
    t.decimal('net_salary', 10, 2).notNullable();
    t.text('notes').nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.unique(['staff_id', 'month', 'year']);
    t.index(['staff_id']);
    t.index(['year', 'month']);
  });

  // ─── updated_at triggers ────────────────────────────────────────────────────
  for (const table of ['inventory', 'staff', 'attendance_logs', 'salary_records']) {
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
  for (const table of ['salary_records', 'attendance_logs', 'staff', 'inventory']) {
    await knex.schema.dropTableIfExists(table);
  }

  await knex.raw('DROP TYPE IF EXISTS "AttendanceStatus"');
  await knex.raw('DROP TYPE IF EXISTS "StaffStatus"');
  await knex.raw('DROP TYPE IF EXISTS "StaffRole"');
  await knex.raw('DROP TYPE IF EXISTS "InventoryCategory"');
}
