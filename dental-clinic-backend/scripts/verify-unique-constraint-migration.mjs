/**
 * Verify unique constraint migration for procedure_catalog.code
 * Same rigor as main TX-04 migration verification
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
console.log('║   VERIFY: procedure_catalog Unique Constraint Migration      ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

try {
  // 1. Row count (should be unchanged)
  console.log('1. ROW COUNT VERIFICATION:');
  console.log('   ─────────────────────────────────────────────────────────────');
  const [{ count }] = await db('procedure_catalog').count('* as count');
  console.log(`   Total rows: ${count}`);
  console.log('   Expected: 3 (from baseline)\n');

  // 2. Check for duplicate codes within same clinic (should be 0)
  console.log('2. DUPLICATE CODE CHECK (within same clinic):');
  console.log('   ─────────────────────────────────────────────────────────────');
  const duplicatesWithinClinic = await db('procedure_catalog')
    .select('clinic_id', 'code')
    .count('* as count')
    .groupBy('clinic_id', 'code')
    .having(db.raw('COUNT(*) > 1'));
  
  if (duplicatesWithinClinic.length > 0) {
    console.log('   ❌ FOUND DUPLICATE CODES WITHIN SAME CLINIC:');
    console.table(duplicatesWithinClinic);
  } else {
    console.log('   ✓ No duplicate codes within any clinic\n');
  }

  // 3. Check for same code across different clinics (this is NOW ALLOWED)
  console.log('3. CROSS-CLINIC CODE SHARING (now allowed):');
  console.log('   ─────────────────────────────────────────────────────────────');
  const crossClinicCodes = await db('procedure_catalog')
    .select('code')
    .count('* as clinic_count')
    .groupBy('code')
    .having(db.raw('COUNT(DISTINCT clinic_id) > 1'));
  
  if (crossClinicCodes.length > 0) {
    console.log(`   Found ${crossClinicCodes.length} code(s) shared across clinics:`);
    for (const row of crossClinicCodes) {
      const details = await db('procedure_catalog')
        .where({ code: row.code })
        .select('code', 'clinic_id', 'name');
      console.log(`\n   Code: ${row.code} (${row.clinic_count} clinics)`);
      details.forEach(d => console.log(`      - Clinic ${d.clinic_id}: ${d.name}`));
    }
    console.log('\n   ⚠️  This is NOW ALLOWED post-migration (per-clinic isolation)');
  } else {
    console.log('   No codes are currently shared across clinics\n');
  }

  // 4. Verify constraint exists
  console.log('4. CONSTRAINT VERIFICATION:');
  console.log('   ─────────────────────────────────────────────────────────────');
  const constraints = await db.raw(`
    SELECT 
      conname AS constraint_name,
      pg_get_constraintdef(oid) AS definition
    FROM pg_constraint
    WHERE conrelid = 'procedure_catalog'::regclass
      AND contype = 'u'
      AND conname LIKE '%code%'
  `);
  
  if (constraints.rows.length === 0) {
    console.log('   ❌ NO UNIQUE CONSTRAINT FOUND ON CODE!\n');
  } else {
    console.log('   Found constraints:');
    constraints.rows.forEach(c => {
      console.log(`   - ${c.constraint_name}: ${c.definition}`);
    });
    
    const hasComposite = constraints.rows.some(c => 
      c.definition.includes('clinic_id') && c.definition.includes('code')
    );
    
    if (hasComposite) {
      console.log('\n   ✓ Composite unique constraint (clinic_id, code) exists\n');
    } else {
      console.log('\n   ⚠️  Composite constraint NOT found - may still have global unique\n');
    }
  }

  // 5. Test constraint enforcement
  console.log('5. CONSTRAINT ENFORCEMENT TEST:');
  console.log('   ─────────────────────────────────────────────────────────────');
  
  const [testClinic] = await db('clinics').select('id').limit(1);
  
  if (testClinic) {
    console.log('   Testing duplicate code within same clinic (should FAIL)...');
    try {
      await db('procedure_catalog').insert({
        code: 'TEST_DUPLICATE',
        name: 'Test 1',
        default_cost: 100,
        clinic_id: testClinic.id,
      });
      
      await db('procedure_catalog').insert({
        code: 'TEST_DUPLICATE',
        name: 'Test 2',
        default_cost: 200,
        clinic_id: testClinic.id,
      });
      
      console.log('   ❌ CONSTRAINT NOT WORKING - duplicate allowed within same clinic!\n');
      
      // Cleanup
      await db('procedure_catalog').where({ code: 'TEST_DUPLICATE' }).del();
      
    } catch (err) {
      if (err.message.includes('unique constraint') || err.message.includes('duplicate key')) {
        console.log('   ✓ Correctly rejected duplicate within same clinic\n');
      } else {
        console.log(`   ⚠️  Unexpected error: ${err.message}\n`);
      }
      
      // Cleanup any inserted rows
      await db('procedure_catalog').where({ code: 'TEST_DUPLICATE' }).del();
    }
  }

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  VERIFICATION COMPLETE                                        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

} catch (err) {
  console.error('\n❌ Verification failed:', err.message);
  console.error(err.stack);
  process.exit(1);
} finally {
  await db.destroy();
}
