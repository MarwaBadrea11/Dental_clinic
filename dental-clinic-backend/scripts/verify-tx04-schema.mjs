/**
 * TX-04 Schema Verification - Show final column structure
 */

import knex from 'knex';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

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

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
});

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║         TX-04 SCHEMA VERIFICATION                             ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

try {
  for (const table of ['procedure_catalog', 'treatment_plans', 'treatment_procedures']) {
    console.log(`TABLE: ${table}`);
    console.log('─'.repeat(70));
    
    const columns = await db.raw(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = ?
      ORDER BY ordinal_position
    `, [table]);
    
    columns.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const name = col.column_name === 'clinic_id' ? `★ ${col.column_name}` : col.column_name;
      console.log(`  ${name.padEnd(30)} ${col.data_type.padEnd(20)} ${nullable}`);
    });
    
    console.log('\n');
  }

  // Sample data from procedure_catalog showing clinic_id
  console.log('SAMPLE DATA: procedure_catalog');
  console.log('─'.repeat(70));
  const samples = await db('procedure_catalog')
    .select('id', 'code', 'name', 'clinic_id')
    .limit(5);
  
  console.table(samples);

} catch (err) {
  console.error('\n❌ Schema verification failed:', err.message);
  process.exit(1);
} finally {
  await db.destroy();
}
