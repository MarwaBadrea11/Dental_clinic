/**
 * Patient Data Verification Script
 * Run: node scripts/check-patients.mjs
 *
 * Connects directly to PostgreSQL and runs diagnostic queries against
 * the patients table to verify data is actually persisting.
 */

import { readFileSync } from 'fs'
import pg from 'pg'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Load .env ─────────────────────────────────────────────────────────────────
function loadEnv(envPath) {
  try {
    const raw = readFileSync(envPath, 'utf8')
    const vars = {}
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
      vars[key] = val
    }
    return vars
  } catch {
    return {}
  }
}

const env = loadEnv(resolve(__dirname, '../.env'))
const connectionString = env.DATABASE_URL

if (!connectionString) {
  console.error('✗ DATABASE_URL not found in .env')
  process.exit(1)
}

const client = new pg.Client({ connectionString, connectionTimeoutMillis: 5000 })

console.log('\n╔══════════════════════════════════════════════╗')
console.log('║     SmileFix — Patient Data Verification     ║')
console.log('╚══════════════════════════════════════════════╝\n')

try {
  await client.connect()
  console.log('✓ Connected to PostgreSQL\n')

  // ── 1. Total count ──────────────────────────────────────────────────────────
  const countRes = await client.query(`
    SELECT COUNT(*) AS total FROM patients WHERE deleted_at IS NULL
  `)
  const total = parseInt(countRes.rows[0].total, 10)
  console.log(`[ 1 ] Total active patients in DB: ${total}`)

  if (total === 0) {
    console.log('      ⚠  No patients found. Either no records have been saved yet,')
    console.log('         or migrations have not been run.\n')
  }

  // ── 2. Most recent 5 patients ───────────────────────────────────────────────
  console.log('\n[ 2 ] Most recent 5 patients (newest first):')
  const recentRes = await client.query(`
    SELECT
      id,
      first_name,
      last_name,
      national_id,
      phone,
      created_at
    FROM patients
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 5
  `)

  if (recentRes.rows.length === 0) {
    console.log('      (none)')
  } else {
    for (const row of recentRes.rows) {
      const ts = new Date(row.created_at).toLocaleString()
      console.log(`      • ${row.first_name} ${row.last_name} | ${row.national_id} | ${row.phone} | created: ${ts}`)
      console.log(`        id: ${row.id}`)
    }
  }

  // ── 3. Check migrations ran ─────────────────────────────────────────────────
  console.log('\n[ 3 ] Migration status (knex_migrations table):')
  try {
    const migRes = await client.query(`
      SELECT name, batch, migration_time
      FROM knex_migrations
      ORDER BY batch, id
    `)
    if (migRes.rows.length === 0) {
      console.log('      ⚠  No migrations recorded — run: npm run db:migrate')
    } else {
      for (const m of migRes.rows) {
        console.log(`      ✓ [batch ${m.batch}] ${m.name}`)
      }
    }
  } catch {
    console.log('      ⚠  knex_migrations table not found — migrations may not have run yet')
    console.log('         Run: npm run db:migrate')
  }

  // ── 4. Table schema sanity check ────────────────────────────────────────────
  console.log('\n[ 4 ] patients table columns:')
  const colRes = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'patients'
    ORDER BY ordinal_position
  `)
  if (colRes.rows.length === 0) {
    console.log('      ⚠  patients table does not exist — run migrations first')
  } else {
    for (const col of colRes.rows) {
      console.log(`      ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} nullable: ${col.is_nullable}`)
    }
  }

  console.log('\n──────────────────────────────────────────────')
  console.log('  Raw SQL you can run in psql / pgAdmin:\n')
  console.log('  -- Count all active patients:')
  console.log('  SELECT COUNT(*) FROM patients WHERE deleted_at IS NULL;\n')
  console.log('  -- Most recent entry:')
  console.log('  SELECT * FROM patients ORDER BY created_at DESC LIMIT 1;\n')
  console.log('  -- All patients (newest first):')
  console.log('  SELECT id, first_name, last_name, national_id, phone, created_at')
  console.log('  FROM patients WHERE deleted_at IS NULL ORDER BY created_at DESC;\n')
  console.log('──────────────────────────────────────────────\n')

} catch (err) {
  console.error(`\n✗ Query failed: ${err.message}`)
  process.exit(1)
} finally {
  await client.end()
}
