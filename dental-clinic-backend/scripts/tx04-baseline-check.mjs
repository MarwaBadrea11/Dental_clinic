/**
 * TX-04 Baseline State Check
 * Captures row counts and verifies default clinic before migration
 */

import knex from 'knex';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env
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

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
});

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║         TX-04 BASELINE STATE CHECK                           ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

try {
  // ─── 1. Verify Default Clinic ────────────────────────────────────────────
  console.log('1. DEFAULT CLINIC VERIFICATION:');
  console.log('   ─────────────────────────────────────────────────────────────');
  
  const clinic = await db('clinics')
    .where({ name: 'SmileFix Main Clinic' })
    .first();
  
  if (!clinic) {
    console.error('   ❌ ERROR: Default clinic "SmileFix Main Clinic" not found!');
    process.exit(1);
  }
  
  console.log(`   ✓ Default Clinic Found:`);
  console.log(`     - ID:   ${clinic.id}`);
  console.log(`     - Name: ${clinic.name}\n`);

  // ─── 2. Row Counts (Baseline) ────────────────────────────────────────────
  console.log('2. BASELINE ROW COUNTS:');
  console.log('   ─────────────────────────────────────────────────────────────');
  
  const counts = await db.raw(`
    SELECT 'procedure_catalog' AS table_name, COUNT(*) AS row_count FROM procedure_catalog
    UNION ALL
    SELECT 'treatment_plans', COUNT(*) FROM treatment_plans
    UNION ALL
    SELECT 'treatment_procedures', COUNT(*) FROM treatment_procedures
    ORDER BY table_name
  `);
  
  counts.rows.forEach(row => {
    console.log(`   ${row.table_name.padEnd(25)} : ${row.row_count} rows`);
  });
  
  console.log('\n3. COLUMN VERIFICATION (pre-migration):');
  console.log('   ─────────────────────────────────────────────────────────────');
  
  // Check if clinic_id already exists
  const pcCols = await db.raw(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'procedure_catalog' AND column_name = 'clinic_id'
  `);
  
  const tpCols = await db.raw(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'treatment_plans' AND column_name = 'clinic_id'
  `);
  
  const tprCols = await db.raw(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'treatment_procedures' AND column_name = 'clinic_id'
  `);
  
  console.log(`   procedure_catalog.clinic_id exists    : ${pcCols.rows.length > 0 ? '✓ YES (UNEXPECTED!)' : '✗ NO (expected)'}`);
  console.log(`   treatment_plans.clinic_id exists      : ${tpCols.rows.length > 0 ? '✓ YES (UNEXPECTED!)' : '✗ NO (expected)'}`);
  console.log(`   treatment_procedures.clinic_id exists : ${tprCols.rows.length > 0 ? '✓ YES (UNEXPECTED!)' : '✗ NO (expected)'}`);
  
  if (pcCols.rows.length > 0 || tpCols.rows.length > 0 || tprCols.rows.length > 0) {
    console.log('\n   ⚠️  WARNING: One or more clinic_id columns already exist!');
    console.log('       Migration may fail or produce unexpected results.');
  }
  
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  BASELINE CAPTURED — Ready for Migration                     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

} catch (err) {
  console.error('\n❌ Baseline check failed:', err.message);
  console.error(err.stack);
  process.exit(1);
} finally {
  await db.destroy();
}
