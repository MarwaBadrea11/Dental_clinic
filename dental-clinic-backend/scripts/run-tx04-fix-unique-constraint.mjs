/**
 * TX-04: Fix procedure_catalog code unique constraint
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
console.log('║   TX-04: Fix procedure_catalog Unique Constraint             ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

try {
  console.log('Dropping global unique constraint on code...');
  await db.schema.alterTable('procedure_catalog', (t) => {
    t.dropUnique(['code']);
  });
  console.log('✓ Dropped\n');

  console.log('Creating composite unique constraint (clinic_id, code)...');
  await db.schema.alterTable('procedure_catalog', (t) => {
    t.unique(['clinic_id', 'code']);
  });
  console.log('✓ Created\n');

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  ✓ Migration Completed                                        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

} catch (err) {
  console.error('\n❌ Migration failed:', err.message);
  console.error(err.stack);
  process.exit(1);
} finally {
  await db.destroy();
}
