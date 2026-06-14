/**
 * QA Seed — inserts 5 unread notifications for NotificationsPage UI testing
 *
 * Run from dental-clinic-backend:
 *   node scripts/seed-notifications.mjs
 *
 * Visible to any logged-in user (broadcast rows where user_id IS NULL).
 * Re-running removes prior rows tagged with metadata.seedTag = "qa-notifications-ui".
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import knex from 'knex'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SEED_TAG = 'qa-notifications-ui'

function loadEnv(envPath) {
  const raw = readFileSync(envPath, 'utf8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    let val = trimmed.slice(eqIdx + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    process.env[key] = process.env[key] ?? val
  }
}

loadEnv(resolve(__dirname, '../.env'))

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
})

/** @type {import('knex').Knex.Raw} */
function minutesAgo(minutes) {
  return db.raw(`NOW() - INTERVAL '${minutes} minutes'`)
}

const NOTIFICATIONS = [
  {
    type:         'inventory',
    severity:     'warning',
    title:        'Low Stock Alert',
    message:      'Dental gloves below minimum level',
    action_label: 'Order Now',
    action_route: '/inventory',
    metadata:     { seedTag: SEED_TAG, sku: 'GLV-001', currentQty: 12, minQty: 50 },
    is_read:      false,
    created_at:   minutesAgo(8),
  },
  {
    type:         'finance',
    severity:     'info',
    title:        'Overdue Debt',
    message:      'Patient Ahmed has an unpaid balance of $200',
    action_label: 'View Financial',
    action_route: '/finance',
    metadata:     { seedTag: SEED_TAG, patientName: 'Ahmed', balance: 200, currency: 'USD' },
    is_read:      false,
    created_at:   minutesAgo(15),
  },
  {
    type:         'system',
    severity:     'error', // DB enum — maps "critical" alerts to error on the frontend
    title:        'Backup Failure',
    message:      'Automatic database backup failed at 03:00 AM',
    action_label: 'View Reports',
    action_route: '/reports',
    metadata:     { seedTag: SEED_TAG, job: 'nightly-backup', failedAt: '03:00' },
    is_read:      false,
    created_at:   minutesAgo(45),
  },
  {
    type:         'appointment',
    severity:     'info',
    title:        "Today's Appointments",
    message:      'You have 5 appointments scheduled for today',
    action_label: 'Open Calendar',
    action_route: '/calendar',
    metadata:     { seedTag: SEED_TAG, count: 5, date: new Date().toISOString().slice(0, 10) },
    is_read:      false,
    created_at:   minutesAgo(3),
  },
  {
    type:         'schedule',
    severity:     'warning',
    title:        'Unconfirmed Appointments',
    message:      '3 patients have not confirmed their appointments for tomorrow',
    action_label: 'Send Reminders',
    action_route: '/calendar',
    metadata:     { seedTag: SEED_TAG, unconfirmedCount: 3 },
    is_read:      false,
    created_at:   minutesAgo(25),
  },
]

console.log('\n╔══════════════════════════════════════════════╗')
console.log('║   SmileFix — Notifications QA Seeder         ║')
console.log('╚══════════════════════════════════════════════╝\n')

try {
  const removed = await db('notifications')
    .whereRaw(`metadata->>'seedTag' = ?`, [SEED_TAG])
    .delete()

  if (removed) {
    console.log(`  ↺  Removed ${removed} previous QA notification row(s)\n`)
  }

  const inserted = await db('notifications')
    .insert(NOTIFICATIONS)
    .returning(['id', 'title', 'severity', 'type', 'is_read'])

  console.log(`  ✓  Inserted ${inserted.length} unread notification(s):\n`)
  for (const row of inserted) {
    console.log(`     • [${row.severity}] ${row.title} (${row.type}) — read: ${row.is_read}`)
  }

  console.log('\n  Log in as admin and open /notifications to verify the UI.\n')
} catch (err) {
  console.error('\n  ✗ Seed failed:', err.message)
  process.exit(1)
} finally {
  await db.destroy()
}
