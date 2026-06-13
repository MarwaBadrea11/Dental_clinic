#!/usr/bin/env node
/**
 * Notification + Reminder End-to-End Test Script
 * ─────────────────────────────────────────────────
 * Tests:
 *  1. POST  /auth/login                        → get JWT
 *  2. GET   /notifications                     → list
 *  3. GET   /notifications/unread-count        → badge count
 *  4. POST  /notifications                     → create test notification
 *  5. GET   /notifications                     → verify it appears
 *  6. PATCH /notifications/:id/read            → mark as read
 *  7. GET   /notifications/unread-count        → verify count
 *  8. DELETE /notifications/:id               → delete it
 *  9. GET   /notifications                     → confirm deleted
 * 10. GET   /notifications/preferences         → get preferences
 * 11. PUT   /notifications/preferences         → update preferences
 * 12. Reminder scheduler DB check (direct DB)
 */

import { db } from '../src/db/db.js';

const BASE = 'http://localhost:3000/api/v1';

const G = '\x1b[32m'; const R = '\x1b[31m';
const Y = '\x1b[33m'; const B = '\x1b[36m'; const X = '\x1b[0m';

let passed = 0; let failed = 0;

function ok(label, detail = '') {
  passed++;
  console.log(`  ${G}✓${X} ${label}${detail ? `  ${Y}${detail}${X}` : ''}`);
}
function fail(label, detail = '') {
  failed++;
  console.log(`  ${R}✗${X} ${label}${detail ? `  ${R}${detail}${X}` : ''}`);
}
function section(title) { console.log(`\n${B}── ${title} ──${X}`); }

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json; try { json = await res.json(); } catch { json = null; }
  return { status: res.status, json };
}

async function run() {
  console.log(`\n${B}╔══════════════════════════════════════════╗`);
  console.log(`║  SmileFix — Notifications API Test Suite  ║`);
  console.log(`╚══════════════════════════════════════════╝${X}\n`);

  // ── 1. Login ──────────────────────────────────────────────────────────────
  section('1. Authentication');
  const login = await req('POST', '/auth/login', {
    email: 'admin@smilefix.com', password: 'Admin@1234',
  });
  if (login.status !== 200 || !login.json?.data?.accessToken) {
    fail('Admin login', `status=${login.status}`);
    console.log(`\n${R}Cannot continue without a valid token.${X}\n`);
    return summarize();
  }
  const token  = login.json.data.accessToken;
  const userId = login.json.data.user?.id;
  ok('Admin login', `userId=${userId?.slice(0,8)}…`);

  // ── 2. List notifications ─────────────────────────────────────────────────
  section('2. GET /notifications');
  const list1 = await req('GET', '/notifications', null, token);
  if (list1.status === 200 && Array.isArray(list1.json?.data?.notifications)) {
    ok('List notifications', `count=${list1.json.data.notifications.length}, unread=${list1.json.data.unreadCount}`);
  } else {
    fail('List notifications', `status=${list1.status}`);
  }

  // ── 3. Unread count ───────────────────────────────────────────────────────
  section('3. GET /notifications/unread-count');
  const count1 = await req('GET', '/notifications/unread-count', null, token);
  const unreadBefore = count1.json?.data?.unreadCount ?? 0;
  if (count1.status === 200 && count1.json?.data?.unreadCount !== undefined) {
    ok('Unread count', `unreadCount=${unreadBefore}`);
  } else {
    fail('Unread count', `status=${count1.status}`);
  }

  // ── 4. Create notification ────────────────────────────────────────────────
  section('4. POST /notifications (create)');
  const createRes = await req('POST', '/notifications', {
    userId,
    type:     'appointment',
    severity: 'info',
    title:    'تذكير بموعدك 🦷',
    message:  'لديك موعد اليوم الساعة 10:00 صباحاً. نتمنى لك رحلة علاجية ممتازة!',
    actionLabel: 'عرض الموعد',
    actionRoute: '/appointments',
    metadata: { appointmentId: 'test-appt-001' },
  }, token);

  let notifId = null;
  if (createRes.status === 201 && createRes.json?.data?.id) {
    notifId = createRes.json.data.id;
    ok('Create notification', `id=${notifId.slice(0,8)}…`);
    console.log(`     ${Y}title:${X}   ${createRes.json.data.title}`);
    console.log(`     ${Y}message:${X} ${createRes.json.data.message}`);
    console.log(`     ${Y}isRead:${X}  ${createRes.json.data.isRead}`);
  } else {
    fail('Create notification', `status=${createRes.status} — ${JSON.stringify(createRes.json?.error)}`);
  }

  // ── 5. Verify appears in list ─────────────────────────────────────────────
  section('5. GET /notifications (verify new one appears)');
  const list2 = await req('GET', '/notifications', null, token);
  if (list2.status === 200) {
    const found = list2.json.data.notifications.find(n => n.id === notifId);
    found ? ok('New notification visible in list', `isRead=${found.isRead}`)
          : fail('New notification not found in list');
  } else {
    fail('List after create', `status=${list2.status}`);
  }

  // ── 6. Mark as read ───────────────────────────────────────────────────────
  section('6. PATCH /notifications/:id/read');
  if (notifId) {
    const markRead = await req('PATCH', `/notifications/${notifId}/read`, null, token);
    if (markRead.status === 200 && markRead.json?.data?.isRead === true) {
      ok('Mark as read', `id=${notifId.slice(0,8)}…`);
    } else {
      fail('Mark as read', `status=${markRead.status} — ${JSON.stringify(markRead.json)}`);
    }
  } else {
    fail('Mark as read', 'skipped — no notification id');
  }

  // ── 7. Unread count after mark-read ──────────────────────────────────────
  section('7. GET /notifications/unread-count (after mark read)');
  const count2 = await req('GET', '/notifications/unread-count', null, token);
  if (count2.status === 200) {
    const unreadAfter = count2.json?.data?.unreadCount ?? 0;
    // After marking our newly created (unread) notification as read,
    // the count should be the same as before we created it (or lower)
    if (unreadAfter <= unreadBefore) {
      ok('Unread count back to pre-create level', `before=${unreadBefore} → after=${unreadAfter}`);
    } else {
      fail('Unread count higher than expected', `before=${unreadBefore} → after=${unreadAfter}`);
    }
  } else {
    fail('Unread count (after mark read)', `status=${count2.status}`);
  }

  // ── 8. Delete notification ────────────────────────────────────────────────
  section('8. DELETE /notifications/:id');
  if (notifId) {
    const del = await req('DELETE', `/notifications/${notifId}`, null, token);
    if (del.status === 204) {
      ok('Delete notification', `id=${notifId.slice(0,8)}…`);
    } else {
      fail('Delete notification', `status=${del.status} — ${JSON.stringify(del.json)}`);
    }
  } else {
    fail('Delete', 'skipped — no notification id');
  }

  // ── 9. Confirm deleted ────────────────────────────────────────────────────
  section('9. GET /notifications (confirm deleted)');
  const list3 = await req('GET', '/notifications', null, token);
  if (list3.status === 200) {
    const stillThere = list3.json.data.notifications.find(n => n.id === notifId);
    stillThere ? fail('Deleted notification still appears in list')
               : ok('Deleted notification no longer in list');
  } else {
    fail('List after delete', `status=${list3.status}`);
  }

  // ── 10. Get preferences ───────────────────────────────────────────────────
  section('10. GET /notifications/preferences');
  const prefs = await req('GET', '/notifications/preferences', null, token);
  if (prefs.status === 200 && prefs.json?.data) {
    ok('Get preferences', `appointmentReminders=${prefs.json.data.appointmentReminders}`);
    console.log(`     ${Y}prefs:${X}`, JSON.stringify(prefs.json.data));
  } else {
    fail('Get preferences', `status=${prefs.status}`);
  }

  // ── 11. Update preferences ────────────────────────────────────────────────
  section('11. PUT /notifications/preferences');
  const updatePrefs = await req('PUT', '/notifications/preferences', {
    appointmentReminders: true,
    systemUpdates: false,
  }, token);
  if (updatePrefs.status === 200 && updatePrefs.json?.data?.appointmentReminders === true) {
    ok('Update preferences', 'appointmentReminders=true saved');
  } else {
    fail('Update preferences', `status=${updatePrefs.status}`);
  }

  // ── 12. Reminder scheduler DB check (direct DB — no buildApp) ────────────
  section('12. Appointment Reminder Scheduler — DB check');
  try {
    const now         = new Date();
    const windowStart = new Date(now.getTime() + 119 * 60 * 1000);
    const windowEnd   = new Date(now.getTime() + 121 * 60 * 1000);

    const upcoming = await db('appointments')
      .whereIn('status', ['CONFIRMED', 'SCHEDULED'])
      .whereBetween('scheduled_at', [windowStart, windowEnd])
      .select('id', 'patient_id', 'scheduled_at', 'status');

    ok('Scheduler query executed', `found ${upcoming.length} appointment(s) in 2-hour window`);

    if (upcoming.length > 0) {
      console.log(`     ${Y}Appointments that would trigger a reminder:${X}`);
      for (const a of upcoming) {
        console.log(`       - id=${a.id.slice(0,8)}… at=${a.scheduled_at} status=${a.status}`);
      }
    } else {
      console.log(`     ${Y}ℹ  No appointments in the 2-hour window right now (expected).${X}`);
      console.log(`     ${Y}   Cron runs every minute and fires when scheduled_at ≈ now+2h.${X}`);
    }

    const [{ count }]  = await db('appointments').count('id as count');
    ok('Appointments table accessible', `total rows=${count}`);

    const [{ count: nc }] = await db('notifications').count('id as count');
    ok('Notifications table accessible', `total rows=${nc}`);

    const hasMeta = await db.schema.hasColumn('appointments', 'metadata');
    hasMeta ? ok('appointments.metadata column exists')
            : fail('appointments.metadata column missing — run: npm run db:migrate');

    // Verify the push helper works end-to-end
    const { NotificationsService } = await import('../src/modules/notifications/notifications.service.js');
    await NotificationsService.push(db, {
      userId:   userId,
      type:     'system',
      severity: 'success',
      title:    'Reminder scheduler — self-test ✓',
      message:  'NotificationsService.push() works correctly.',
    });
    ok('NotificationsService.push() helper works');

    // Clean up the self-test notification
    await db('notifications')
      .where({ user_id: userId, title: 'Reminder scheduler — self-test ✓' })
      .delete();
    ok('Self-test notification cleaned up');

  } catch (err) {
    fail('Scheduler DB check', err.message);
  } finally {
    await db.destroy();
  }

  summarize();
}

function summarize() {
  const total = passed + failed;
  console.log(`\n${B}─────────────────────────────────────────${X}`);
  console.log(`  Results: ${G}${passed} passed${X}  ${failed > 0 ? R : G}${failed} failed${X}  (${total} total)`);
  console.log(`${B}─────────────────────────────────────────${X}\n`);
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error(`${R}Fatal:${X}`, err.message);
  process.exit(1);
});
