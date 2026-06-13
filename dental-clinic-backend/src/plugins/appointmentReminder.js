// ─────────────────────────────────────────────────────────────────────────────
// Appointment Reminder Plugin
//
// Runs a cron job every minute.
// Finds all CONFIRMED / SCHEDULED appointments whose scheduled_at falls within
// the next 2 hours (±1 min window) and pushes a notification to the patient's
// linked user account via the existing NotificationsService.push() helper.
//
// Notifications are deduplicated: a metadata flag `reminder_2h_sent` is stored
// on the appointment row so the same reminder is never sent twice.
// ─────────────────────────────────────────────────────────────────────────────

import fp       from 'fastify-plugin';
import cron     from 'node-cron';
import { NotificationsService } from '../modules/notifications/notifications.service.js';

/**
 * Resolve the users.id that owns a patient record.
 * We match by email (primary) or by phone = username (fallback).
 *
 * @param {import('knex').Knex} db
 * @param {string}              patientId
 * @returns {Promise<string|null>}
 */
async function resolvePatientUserId(db, patientId) {
  const patient = await db('patients').where({ id: patientId }).first();
  if (!patient) return null;

  // Try email match first
  if (patient.email) {
    const user = await db('users')
      .whereRaw('LOWER(email) = LOWER(?)', [patient.email])
      .where('is_active', true)
      .first();
    if (user) return user.id;
  }

  // Fallback: phone = username
  if (patient.phone) {
    const user = await db('users')
      .where('username', patient.phone)
      .where('is_active', true)
      .first();
    if (user) return user.id;
  }

  return null;
}

/**
 * Core reminder job.  Called by the cron schedule and exposed for testing.
 *
 * @param {import('knex').Knex} db
 * @param {import('pino').Logger} [log]
 */
export async function runAppointmentReminderJob(db, log) {
  const now       = new Date();
  // Target window: appointments starting between now+119 min and now+121 min
  const windowStart = new Date(now.getTime() + 119 * 60 * 1000);
  const windowEnd   = new Date(now.getTime() + 121 * 60 * 1000);

  // Find qualifying appointments that haven't had their 2-hour reminder sent yet
  const appointments = await db('appointments')
    .whereIn('status', ['CONFIRMED', 'SCHEDULED'])
    .whereBetween('scheduled_at', [windowStart, windowEnd])
    .whereRaw(`(metadata->>'reminder_2h_sent') IS DISTINCT FROM 'true'`)
    .select('id', 'patient_id', 'dentist_id', 'scheduled_at', 'notes', 'metadata');

  if (appointments.length === 0) return;

  log?.info(`[appointmentReminder] Found ${appointments.length} appointment(s) to remind.`);

  for (const appt of appointments) {
    try {
      // Resolve the patient's user account for notification targeting
      const userId = await resolvePatientUserId(db, appt.patient_id);

      if (!userId) {
        log?.warn(`[appointmentReminder] No user account for patient ${appt.patient_id} — skipping.`);
      } else {
        // Format the appointment time for the notification message
        const apptDate = new Date(appt.scheduled_at);
        const timeStr  = apptDate.toLocaleTimeString('ar-SA', {
          hour: '2-digit', minute: '2-digit', hour12: true,
        });
        const dateStr  = apptDate.toLocaleDateString('ar-SA', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        });

        await NotificationsService.push(db, {
          userId,
          type:        'appointment',
          severity:    'info',
          title:       'تذكير بموعدك 🦷',
          message:     `لديك موعد في العيادة اليوم الساعة ${timeStr} — ${dateStr}. نتمنى لك رحلة علاجية ممتازة!`,
          actionLabel: 'عرض الموعد',
          actionRoute: '/appointments',
          metadata:    { appointmentId: appt.id },
        });
      }

      // Mark the reminder as sent on the appointment row so it's not re-sent
      const currentMeta = typeof appt.metadata === 'string'
        ? JSON.parse(appt.metadata ?? '{}')
        : (appt.metadata ?? {});

      await db('appointments')
        .where({ id: appt.id })
        .update({
          metadata:   JSON.stringify({ ...currentMeta, reminder_2h_sent: true }),
          updated_at: db.fn.now(),
        });

      log?.info(`[appointmentReminder] Reminder sent for appointment ${appt.id}.`);
    } catch (err) {
      // Never let one failure break the loop for other appointments
      log?.error(`[appointmentReminder] Failed for appointment ${appt.id}: ${err?.message}`);
    }
  }
}

// ── Fastify Plugin ────────────────────────────────────────────────────────────

async function appointmentReminderPlugin(fastify) {
  // Wait until the server is ready (db plugin is registered) before starting
  fastify.addHook('onReady', async () => {
    const db  = fastify.db;
    const log = fastify.log;

    // Run every minute — the job itself filters to the 2-hour window
    const task = cron.schedule('* * * * *', async () => {
      try {
        await runAppointmentReminderJob(db, log);
      } catch (err) {
        log.error(`[appointmentReminder] Unhandled error in cron job: ${err?.message}`);
      }
    });

    // Stop the cron task cleanly when the server closes
    fastify.addHook('onClose', async () => task.stop());

    log.info('[appointmentReminder] 2-hour appointment reminder scheduler started.');
  });
}

export default fp(appointmentReminderPlugin, {
  name: 'appointment-reminder',
  dependencies: ['knex'],
});
