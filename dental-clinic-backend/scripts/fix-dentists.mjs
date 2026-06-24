/**
 * Fix: ensure all DENTIST users have is_active = true
 * and print their current status for diagnostics.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import knex from 'knex';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv(envPath) {
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = process.env[key] ?? val;
  }
}

loadEnv(resolve(__dirname, '../.env'));

const db = knex({ client: 'pg', connection: process.env.DATABASE_URL });

console.log('\n╔══════════════════════════════════════════════╗');
console.log('║     SmileFix — Dentist Activation Fix        ║');
console.log('╚══════════════════════════════════════════════╝\n');

try {
  // Show all users and their status
  const allUsers = await db('users').select('id', 'username', 'email', 'role', 'is_active').orderBy('role');
  console.log('  All users in DB:');
  for (const u of allUsers) {
    console.log(`    ${u.is_active ? '✓' : '✗'} [${u.role}] ${u.email} — is_active: ${u.is_active}`);
  }

  // Activate all dentists
  const updated = await db('users').where({ role: 'DENTIST' }).update({ is_active: true });
  console.log(`\n  ✓ Activated ${updated} DENTIST user(s)\n`);

  // Verify
  const dentists = await db('users').where({ role: 'DENTIST', is_active: true }).select('id', 'username', 'email');
  console.log('  Active dentists now available to mobile app:');
  for (const d of dentists) {
    console.log(`    • ${d.username} (${d.email})`);
  }
} catch (err) {
  console.error('\n  ✗ Error:', err.message);
  process.exit(1);
} finally {
  await db.destroy();
}
