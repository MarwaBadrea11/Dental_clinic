/**
 * Seed Script — creates a test admin user
 * Run: node scripts/seed.mjs
 *
 * Login after seeding:
 *   POST http://localhost:3000/api/v1/auth/login
 *   { "email": "admin@smilefix.com", "password": "Admin@1234" }
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcrypt'
import knex from 'knex'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Load .env ─────────────────────────────────────────────────────────────────
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

// ── DB connection ─────────────────────────────────────────────────────────────
const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
})

// ── Seed data ─────────────────────────────────────────────────────────────────
const USERS = [
  {
    username: 'admin',
    email:    'admin@smilefix.com',
    password: 'Admin@1234',   // meets: 8+ chars, uppercase, digit, special char
    role:     'ADMIN',
  },
  {
    username: 'dr.smith',
    email:    'dr.smith@smilefix.com',
    password: 'Doctor@1234',
    role:     'DENTIST',
  },
  {
    username: 'dr.jones',
    email:    'dr.jones@smilefix.com',
    password: 'Dentist@5678',
    role:     'DENTIST',
  },
]

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10)

// ── Run ───────────────────────────────────────────────────────────────────────
console.log('\n╔══════════════════════════════════════════════╗')
console.log('║         SmileFix — DB Seeder                 ║')
console.log('╚══════════════════════════════════════════════╝\n')

try {
  for (const u of USERS) {
    const existing = await db('users').where({ email: u.email }).first()

    if (existing) {
      console.log(`  ⚠  Skipped  — ${u.email} already exists`)
      continue
    }

    const password_hash = await bcrypt.hash(u.password, BCRYPT_ROUNDS)

    await db('users').insert({
      username:      u.username,
      email:         u.email,
      password_hash,
      role:          u.role,
    })

    console.log(`  ✓  Inserted — ${u.email}  (role: ${u.role})`)
  }

  console.log('\n  Done. You can now log in with:\n')
  for (const u of USERS) {
    console.log(`    email   : ${u.email}`)
    console.log(`    password: ${u.password}`)
    console.log(`    role    : ${u.role}\n`)
  }
} catch (err) {
  console.error('\n  ✗ Seed failed:', err.message)
  process.exit(1)
} finally {
  await db.destroy()
}
