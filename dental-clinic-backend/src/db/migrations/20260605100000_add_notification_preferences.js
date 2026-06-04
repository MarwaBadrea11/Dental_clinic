/**
 * Migration: add notification_preferences JSONB column to users table.
 *
 * Stores per-user toggle preferences for in-app notifications.
 * Default mirrors the frontend initial state so the UI loads correctly
 * even before the user has explicitly saved preferences.
 *
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.schema.alterTable('users', (t) => {
    t.jsonb('notification_preferences')
      .notNullable()
      .defaultTo(JSON.stringify({
        appointmentReminders: true,
        newPatients:          true,
        paymentAlerts:        true,
        lowInventory:         true,
        systemUpdates:        false,
        weeklyReports:        true,
        smsNotifications:     false,
        emailDigest:          true,
      }));
  });
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('notification_preferences');
  });
}
