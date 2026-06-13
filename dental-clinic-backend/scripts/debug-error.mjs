// Start server with full logging enabled to capture the 500 error
import { buildApp } from '../src/app.js';
import { db } from '../src/db/db.js';

const app = await buildApp({ logger: true });
await app.listen({ port: 3088, host: '127.0.0.1' });

const BASE = 'http://127.0.0.1:3088/api/v1';
const h = (t) => ({ 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) });

const login = await (await fetch(`${BASE}/auth/login`, { method: 'POST', headers: h(), body: JSON.stringify({ email: 'admin@smilefix.com', password: 'Admin@1234' }) })).json();
const token = login.data.accessToken;
const userId = login.data.user.id;
console.log('\n=== Login OK, userId:', userId, '===\n');

const cr = await (await fetch(`${BASE}/notifications`, { method: 'POST', headers: h(token), body: JSON.stringify({ userId, type: 'appointment', severity: 'info', title: 'test', message: 'test' }) })).json();
const id = cr.data.id;
console.log('Created notif id:', id, '\n');

console.log('=== PATCH request ===');
const patchRes = await fetch(`${BASE}/notifications/${id}/read`, { method: 'PATCH', headers: h(token) });
const patchBody = await patchRes.text();
console.log('PATCH status:', patchRes.status);
console.log('PATCH body:', patchBody);

await app.close();
await db.destroy();
