/**
 * Inline notification test — starts its own fresh server instance,
 * so it doesn't depend on the externally running server.
 */
import { buildApp } from '../src/app.js';
import { db } from '../src/db/db.js';

const G = '\x1b[32m'; const R = '\x1b[31m';
const Y = '\x1b[33m'; const B = '\x1b[36m'; const X = '\x1b[0m';
let passed = 0; let failed = 0;

const ok   = (l, d='') => { passed++; console.log(`  ${G}✓${X} ${l}${d ? `  ${Y}${d}${X}` : ''}`); };
const fail = (l, d='') => { failed++; console.log(`  ${R}✗${X} ${l}${d ? `  ${R}${d}${X}` : ''}`); };
const sec  = (t)        => console.log(`\n${B}── ${t} ──${X}`);

// Start a fresh server on a different port to avoid colliding with the running one
const app = await buildApp({ logger: false });
await app.listen({ port: 3099, host: '127.0.0.1' });
console.log(`\n${B}╔══════════════════════════════════════════╗`);
console.log(`║  Inline Notification Test (port 3099)    ║`);
console.log(`╚══════════════════════════════════════════╝${X}\n`);

const BASE = 'http://127.0.0.1:3099/api/v1';

async function req(method, path, body, token) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  const r = await fetch(`${BASE}${path}`, {
    method, headers: h,
    body: body ? JSON.stringify(body) : undefined,
  });
  let j; try { j = await r.json(); } catch { j = null; }
  return { status: r.status, json: j };
}

// ── 1. Login ──────────────────────────────────────────────────────────────────
sec('1. Authentication');
const login = await req('POST', '/auth/login', { email: 'admin@smilefix.com', password: 'Admin@1234' });
if (login.status !== 200) { fail('Login', `status=${login.status}`); process.exit(1); }
const token  = login.json.data.accessToken;
const userId = login.json.data.user?.id;
ok('Login', `userId=${userId.slice(0,8)}…`);

// ── 2. List ───────────────────────────────────────────────────────────────────
sec('2. GET /notifications');
const list1 = await req('GET', '/notifications', null, token);
const initialCount = list1.json?.data?.notifications?.length ?? 0;
list1.status === 200
  ? ok('List notifications', `count=${initialCount}, unread=${list1.json.data.unreadCount}`)
  : fail('List notifications', `status=${list1.status}`);

// ── 3. Unread count ───────────────────────────────────────────────────────────
sec('3. GET /notifications/unread-count');
const uc1 = await req('GET', '/notifications/unread-count', null, token);
const unreadBefore = uc1.json?.data?.unreadCount ?? 0;
uc1.status === 200
  ? ok('Unread count', `count=${unreadBefore}`)
  : fail('Unread count', `status=${uc1.status}`);

// ── 4. Create ─────────────────────────────────────────────────────────────────
sec('4. POST /notifications (create)');
const cr = await req('POST', '/notifications', {
  userId, type: 'appointment', severity: 'info',
  title: 'تذكير بموعدك 🦷',
  message: 'لديك موعد اليوم الساعة 10:00 صباحاً. نتمنى لك رحلة علاجية ممتازة!',
  actionLabel: 'عرض الموعد', actionRoute: '/appointments',
  metadata: { appointmentId: 'test-001' },
}, token);
let notifId = null;
if (cr.status === 201 && cr.json?.data?.id) {
  notifId = cr.json.data.id;
  ok('Create notification', `id=${notifId.slice(0,8)}…`);
  console.log(`     ${Y}title:${X}   ${cr.json.data.title}`);
  console.log(`     ${Y}message:${X} ${cr.json.data.message}`);
  console.log(`     ${Y}isRead:${X}  ${cr.json.data.isRead}`);
} else {
  fail('Create notification', `status=${cr.status} — ${JSON.stringify(cr.json)}`);
}

// ── 5. Verify in list ─────────────────────────────────────────────────────────
sec('5. GET /notifications (verify new one appears)');
const list2 = await req('GET', '/notifications', null, token);
if (list2.status === 200) {
  const found = list2.json.data.notifications.find(n => n.id === notifId);
  found ? ok('Notification visible in list', `isRead=${found.isRead}`)
        : fail('Notification not found in list');
} else fail('List after create', `status=${list2.status}`);

// ── 6. Mark as read ───────────────────────────────────────────────────────────
sec('6. PATCH /notifications/:id/read');
if (notifId) {
  const patch = await req('PATCH', `/notifications/${notifId}/read`, null, token);
  patch.status === 200 && patch.json?.data?.isRead === true
    ? ok('Mark as read', `id=${notifId.slice(0,8)}…`)
    : fail('Mark as read', `status=${patch.status} — ${JSON.stringify(patch.json)}`);
} else fail('Mark as read', 'skipped');

// ── 7. Unread count after read ────────────────────────────────────────────────
sec('7. GET /notifications/unread-count (after mark read)');
const uc2 = await req('GET', '/notifications/unread-count', null, token);
if (uc2.status === 200) {
  const unreadAfter = uc2.json?.data?.unreadCount ?? 0;
  unreadAfter <= unreadBefore
    ? ok('Unread count ≤ pre-create value', `${unreadBefore} → ${unreadAfter}`)
    : fail('Unread count unexpectedly higher', `${unreadBefore} → ${unreadAfter}`);
} else fail('Unread count', `status=${uc2.status}`);

// ── 8. Delete ─────────────────────────────────────────────────────────────────
sec('8. DELETE /notifications/:id');
if (notifId) {
  const del = await req('DELETE', `/notifications/${notifId}`, null, token);
  del.status === 204
    ? ok('Delete notification', `id=${notifId.slice(0,8)}…`)
    : fail('Delete notification', `status=${del.status} — ${JSON.stringify(del.json)}`);
} else fail('Delete', 'skipped');

// ── 9. Confirm gone ───────────────────────────────────────────────────────────
sec('9. GET /notifications (confirm deleted)');
const list3 = await req('GET', '/notifications', null, token);
if (list3.status === 200) {
  const stillThere = list3.json.data.notifications.find(n => n.id === notifId);
  stillThere ? fail('Deleted notification still in list')
             : ok('Deleted notification gone');
} else fail('List after delete', `status=${list3.status}`);

// ── 10. Preferences GET ───────────────────────────────────────────────────────
sec('10. GET /notifications/preferences');
const prefs = await req('GET', '/notifications/preferences', null, token);
prefs.status === 200 && prefs.json?.data
  ? ok('Get preferences', `appointmentReminders=${prefs.json.data.appointmentReminders}`)
  : fail('Get preferences', `status=${prefs.status}`);

// ── 11. Preferences PUT ───────────────────────────────────────────────────────
sec('11. PUT /notifications/preferences');
const up = await req('PUT', '/notifications/preferences',
  { appointmentReminders: true, systemUpdates: false }, token);
up.status === 200 && up.json?.data?.appointmentReminders === true
  ? ok('Update preferences', 'appointmentReminders=true saved')
  : fail('Update preferences', `status=${up.status}`);

// ── 12. Reminder scheduler DB check ──────────────────────────────────────────
sec('12. Appointment Reminder Scheduler — DB check');
const now = new Date();
const ws  = new Date(now.getTime() + 119 * 60 * 1000);
const we  = new Date(now.getTime() + 121 * 60 * 1000);
const upcoming = await db('appointments')
  .whereIn('status', ['CONFIRMED', 'SCHEDULED'])
  .whereBetween('scheduled_at', [ws, we])
  .select('id', 'patient_id', 'scheduled_at', 'status');
ok('Scheduler window query OK', `found ${upcoming.length} appt(s) in 2h window`);
if (upcoming.length === 0)
  console.log(`     ${Y}ℹ  No appointments in 2h window right now — expected.${X}`);

const [{ count: ac }] = await db('appointments').count('id as count');
ok('Appointments table', `total rows=${ac}`);

const [{ count: nc }] = await db('notifications').count('id as count');
ok('Notifications table', `total rows=${nc}`);

const hasMeta = await db.schema.hasColumn('appointments', 'metadata');
hasMeta ? ok('appointments.metadata column exists')
        : fail('appointments.metadata column missing');

const { NotificationsService } = await import('../src/modules/notifications/notifications.service.js');
await NotificationsService.push(db, {
  userId, type: 'system', severity: 'success',
  title: 'Scheduler self-test ✓', message: 'push() works.',
});
ok('NotificationsService.push() works');
await db('notifications')
  .where({ user_id: userId, title: 'Scheduler self-test ✓' }).delete();
ok('Self-test notification cleaned up');

// ── Summary ───────────────────────────────────────────────────────────────────
const total = passed + failed;
console.log(`\n${B}─────────────────────────────────────────${X}`);
console.log(`  Results: ${G}${passed} passed${X}  ${failed > 0 ? R : G}${failed} failed${X}  (${total} total)`);
console.log(`${B}─────────────────────────────────────────${X}\n`);

await app.close();
await db.destroy();
if (failed > 0) process.exit(1);
