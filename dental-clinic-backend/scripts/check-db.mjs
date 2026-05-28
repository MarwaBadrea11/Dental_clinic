/**
 * DB Connection Diagnostic Script
 * Run: node scripts/check-db.mjs
 *
 * Reads credentials from .env and attempts a real PostgreSQL connection.
 * Reports exactly what went wrong if it fails.
 */

import { readFileSync } from 'fs'
import { createConnection } from 'net'
import pg from 'pg'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Load .env manually (no dotenv dependency needed) ─────────────────────────
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
      // Strip surrounding quotes
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

const envPath = resolve(__dirname, '../.env')
const env = loadEnv(envPath)

const host     = env.DB_HOST     || 'localhost'
const port     = parseInt(env.DB_PORT || '5432', 10)
const user     = env.DB_USER     || 'postgres'
const password = env.DB_PASSWORD || ''
const database = env.DB_NAME     || 'postgres'

console.log('\n╔══════════════════════════════════════════════╗')
console.log('║     SmileFix — DB Connection Diagnostic      ║')
console.log('╚══════════════════════════════════════════════╝\n')
console.log(`  Host     : ${host}`)
console.log(`  Port     : ${port}`)
console.log(`  User     : ${user}`)
console.log(`  Password : ${'*'.repeat(password.length)} (${password.length} chars)`)
console.log(`  Database : ${database}`)
console.log()

// ── Step 1: TCP reachability ──────────────────────────────────────────────────
async function checkTCP() {
  return new Promise((resolve) => {
    const sock = createConnection({ host, port }, () => {
      sock.destroy()
      resolve(true)
    })
    sock.on('error', () => resolve(false))
    sock.setTimeout(3000, () => { sock.destroy(); resolve(false) })
  })
}

// ── Step 2: Postgres auth ─────────────────────────────────────────────────────
async function checkPostgres() {
  const client = new pg.Client({ host, port, user, password, database, connectionTimeoutMillis: 5000 })
  try {
    await client.connect()
    const res = await client.query('SELECT version()')
    await client.end()
    return { ok: true, version: res.rows[0].version }
  } catch (err) {
    return { ok: false, code: err.code, message: err.message }
  }
}

// ── Run ───────────────────────────────────────────────────────────────────────
console.log('[ 1/2 ] Checking TCP connectivity...')
const tcpOk = await checkTCP()

if (!tcpOk) {
  console.log(`  ✗ Cannot reach PostgreSQL at ${host}:${port}`)
  console.log('    → Is PostgreSQL installed and running?')
  console.log('    → PowerShell: Get-Service -Name postgresql*')
  console.log('    → Or check pgAdmin / Services panel\n')
  process.exit(1)
}

console.log(`  ✓ TCP connection to ${host}:${port} succeeded\n`)

console.log('[ 2/2 ] Authenticating with PostgreSQL...')
const result = await checkPostgres()

if (result.ok) {
  console.log('  ✓ Authentication SUCCEEDED')
  console.log(`  ✓ ${result.version}\n`)
  console.log('  Your .env credentials are correct. The server should start fine.\n')
  process.exit(0)
}

// ── Failure diagnosis ─────────────────────────────────────────────────────────
console.log(`  ✗ Authentication FAILED (code: ${result.code})`)
console.log(`  ✗ ${result.message}\n`)

if (result.code === '28P01') {
  console.log('  DIAGNOSIS: Wrong password for user "' + user + '"')
  console.log('  ─────────────────────────────────────────────')
  console.log('  To reset the postgres password, run in PowerShell (as Admin):\n')
  console.log('    # 1. Open psql as the postgres OS user:')
  console.log('    & "C:\\Program Files\\PostgreSQL\\<version>\\bin\\psql.exe" -U postgres\n')
  console.log('    # 2. Inside psql, run:')
  console.log("    ALTER USER postgres WITH PASSWORD 'your_new_password';\n")
  console.log('    # 3. Update DB_PASSWORD in .env to match.\n')
  console.log('  Alternatively, try common defaults: postgres, admin, 1234, (empty)')
} else if (result.code === '3D000') {
  console.log(`  DIAGNOSIS: Database "${database}" does not exist`)
  console.log('  Run in psql: CREATE DATABASE ' + database + ';')
} else if (result.code === '28000') {
  console.log('  DIAGNOSIS: User "' + user + '" is not allowed to connect')
  console.log('  Check pg_hba.conf authentication settings')
} else {
  console.log('  Unexpected error — check PostgreSQL logs for details')
}

console.log()
process.exit(1)
