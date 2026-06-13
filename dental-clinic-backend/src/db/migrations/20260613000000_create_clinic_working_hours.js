/**
 * Migration: clinic_working_hours table
 *
 * Stores one row per day-of-week (0 = Sunday … 6 = Saturday).
 * Each row defines whether the clinic is open that day and the
 * optional morning / evening shift time ranges (HH:mm strings).
 *
 * A NULL shift start/end means that shift is disabled for that day.
 */
export async function up(knex) {
  const exists = await knex.schema.hasTable('clinic_working_hours');
  if (!exists) {
    await knex.schema.createTable('clinic_working_hours', (t) => {
      t.increments('id').primary();
      // 0 = Sunday, 1 = Monday, … 6 = Saturday
      t.integer('day_of_week').notNullable().unique().checkBetween([0, 6]);
      t.boolean('is_open').notNullable().defaultTo(false);
      // Morning shift  (e.g. "09:00" – "13:00")
      t.string('morning_start', 5).nullable();   // HH:mm
      t.string('morning_end',   5).nullable();
      // Evening shift  (e.g. "17:00" – "21:00")
      t.string('evening_start', 5).nullable();
      t.string('evening_end',   5).nullable();
      t.timestamp('updated_at').defaultTo(knex.fn.now());
    });

    // Seed default schedule: Sun–Thu open, morning 09:00-13:00, evening 17:00-21:00
    const defaults = [
      { day_of_week: 0, is_open: true,  morning_start: '09:00', morning_end: '13:00', evening_start: '17:00', evening_end: '21:00' }, // Sun
      { day_of_week: 1, is_open: true,  morning_start: '09:00', morning_end: '13:00', evening_start: '17:00', evening_end: '21:00' }, // Mon
      { day_of_week: 2, is_open: true,  morning_start: '09:00', morning_end: '13:00', evening_start: '17:00', evening_end: '21:00' }, // Tue
      { day_of_week: 3, is_open: true,  morning_start: '09:00', morning_end: '13:00', evening_start: '17:00', evening_end: '21:00' }, // Wed
      { day_of_week: 4, is_open: true,  morning_start: '09:00', morning_end: '13:00', evening_start: '17:00', evening_end: '21:00' }, // Thu
      { day_of_week: 5, is_open: false, morning_start: null,     morning_end: null,    evening_start: null,    evening_end: null    }, // Fri
      { day_of_week: 6, is_open: false, morning_start: null,     morning_end: null,    evening_start: null,    evening_end: null    }, // Sat
    ];
    await knex('clinic_working_hours').insert(defaults);
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('clinic_working_hours');
}
