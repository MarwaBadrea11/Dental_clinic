/**
 * TX-04 Migration Executor with Full Verification
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
console.log('║         TX-04 MIGRATION EXECUTOR                              ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

try {
  const defaultClinicId = '0fb2c694-5100-4626-9ce5-4650b6dfa7ec';

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 1: procedure_catalog
  // ──────────────────────────────────────────────────────────────────────────
  console.log('STEP 1: Adding clinic_id to procedure_catalog...');
  
  await db.schema.alterTable('procedure_catalog', (t) => {
    t.uuid('clinic_id').nullable();
  });
  console.log('  ✓ Column added (nullable)');

  const pcUpdated = await db.raw(`
    UPDATE procedure_catalog
    SET clinic_id = ?
    WHERE clinic_id IS NULL
    RETURNING id
  `, [defaultClinicId]);
  console.log(`  ✓ Backfilled ${pcUpdated.rows.length} rows`);

  await db.schema.alterTable('procedure_catalog', (t) => {
    t.uuid('clinic_id').notNullable().alter();
    t.foreign('clinic_id').references('id').inTable('clinics').onDelete('RESTRICT').onUpdate('CASCADE');
  });
  console.log('  ✓ Made NOT NULL + FK constraint added\n');

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 2: treatment_plans
  // ──────────────────────────────────────────────────────────────────────────
  console.log('STEP 2: Adding clinic_id to treatment_plans...');
  
  await db.schema.alterTable('treatment_plans', (t) => {
    t.uuid('clinic_id').nullable();
  });
  console.log('  ✓ Column added (nullable)');

  const tpUpdated = await db.raw(`
    UPDATE treatment_plans tp
    SET clinic_id = p.clinic_id
    FROM patients p
    WHERE tp.patient_id = p.id AND tp.clinic_id IS NULL
    RETURNING tp.id
  `);
  console.log(`  ✓ Backfilled ${tpUpdated.rows.length} rows`);

  await db.schema.alterTable('treatment_plans', (t) => {
    t.uuid('clinic_id').notNullable().alter();
    t.foreign('clinic_id').references('id').inTable('clinics').onDelete('RESTRICT').onUpdate('CASCADE');
  });
  console.log('  ✓ Made NOT NULL + FK constraint added\n');

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 3: treatment_procedures
  // ──────────────────────────────────────────────────────────────────────────
  console.log('STEP 3: Adding clinic_id to treatment_procedures...');
  
  await db.schema.alterTable('treatment_procedures', (t) => {
    t.uuid('clinic_id').nullable();
  });
  console.log('  ✓ Column added (nullable)');

  const tprUpdated = await db.raw(`
    UPDATE treatment_procedures tpr
    SET clinic_id = tp.clinic_id
    FROM treatment_plans tp
    WHERE tpr.treatment_plan_id = tp.id AND tpr.clinic_id IS NULL
    RETURNING tpr.id
  `);
  console.log(`  ✓ Backfilled ${tprUpdated.rows.length} rows`);

  await db.schema.alterTable('treatment_procedures', (t) => {
    t.uuid('clinic_id').notNullable().alter();
    t.foreign('clinic_id').references('id').inTable('clinics').onDelete('RESTRICT').onUpdate('CASCADE');
  });
  console.log('  ✓ Made NOT NULL + FK constraint added\n');

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 4: Add Indexes
  // ──────────────────────────────────────────────────────────────────────────
  console.log('STEP 4: Adding indexes...');
  
  await db.schema.alterTable('procedure_catalog', (t) => {
    t.index(['clinic_id']);
    t.index(['clinic_id', 'code']);
    t.index(['clinic_id', 'is_active']);
  });
  console.log('  ✓ procedure_catalog indexes added');

  await db.schema.alterTable('treatment_plans', (t) => {
    t.index(['clinic_id']);
    t.index(['clinic_id', 'patient_id']);
    t.index(['clinic_id', 'dentist_id']);
    t.index(['clinic_id', 'status']);
  });
  console.log('  ✓ treatment_plans indexes added');

  await db.schema.alterTable('treatment_procedures', (t) => {
    t.index(['clinic_id']);
    t.index(['clinic_id', 'treatment_plan_id']);
  });
  console.log('  ✓ treatment_procedures indexes added\n');

  // ──────────────────────────────────────────────────────────────────────────
  // POST-MIGRATION VERIFICATION
  // ──────────────────────────────────────────────────────────────────────────
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         POST-MIGRATION VERIFICATION                           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // 1. Row Counts
  console.log('1. ROW COUNTS (after migration):');
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

  // 2. Verification Queries
  console.log('\n2. CROSS-CLINIC REFERENCE CHECKS:');
  console.log('   ─────────────────────────────────────────────────────────────\n');

  // Verification A: treatment_procedures → procedure_catalog
  console.log('   A) treatment_procedures → procedure_catalog consistency:');
  const verifyA = await db.raw(`
    SELECT 
      tp.id AS treatment_procedure_id,
      tp.clinic_id AS tp_clinic_id,
      pc.id AS procedure_catalog_id,
      pc.clinic_id AS pc_clinic_id
    FROM treatment_procedures tp
    JOIN procedure_catalog pc ON tp.procedure_id = pc.id
    WHERE tp.clinic_id != pc.clinic_id
  `);
  
  if (verifyA.rows.length > 0) {
    console.log(`      ❌ FOUND ${verifyA.rows.length} CROSS-CLINIC REFERENCES!`);
    console.table(verifyA.rows);
    throw new Error('VERIFICATION FAILED: Cross-clinic references detected in treatment_procedures');
  } else {
    console.log('      ✓ PASS: 0 cross-clinic references\n');
  }

  // Verification B: treatment_plans → patients
  console.log('   B) treatment_plans → patients consistency:');
  const verifyB = await db.raw(`
    SELECT 
      t.id AS treatment_plan_id,
      t.clinic_id AS plan_clinic_id,
      p.id AS patient_id,
      p.clinic_id AS patient_clinic_id
    FROM treatment_plans t
    JOIN patients p ON t.patient_id = p.id
    WHERE t.clinic_id != p.clinic_id
  `);
  
  if (verifyB.rows.length > 0) {
    console.log(`      ❌ FOUND ${verifyB.rows.length} CROSS-CLINIC REFERENCES!`);
    console.table(verifyB.rows);
    throw new Error('VERIFICATION FAILED: Cross-clinic references detected in treatment_plans → patients');
  } else {
    console.log('      ✓ PASS: 0 cross-clinic references\n');
  }

  // Verification C: treatment_plans → users (dentist)
  console.log('   C) treatment_plans → users (dentist) consistency:');
  const verifyC = await db.raw(`
    SELECT 
      t.id AS treatment_plan_id,
      t.clinic_id AS plan_clinic_id,
      u.id AS dentist_id,
      u.clinic_id AS dentist_clinic_id
    FROM treatment_plans t
    JOIN users u ON t.dentist_id = u.id
    WHERE t.clinic_id != u.clinic_id
  `);
  
  if (verifyC.rows.length > 0) {
    console.log(`      ❌ FOUND ${verifyC.rows.length} CROSS-CLINIC REFERENCES!`);
    console.table(verifyC.rows);
    throw new Error('VERIFICATION FAILED: Cross-clinic references detected in treatment_plans → dentist');
  } else {
    console.log('      ✓ PASS: 0 cross-clinic references\n');
  }

  // Verification D: treatment_procedures → treatment_plans
  console.log('   D) treatment_procedures → treatment_plans consistency:');
  const verifyD = await db.raw(`
    SELECT 
      tp.id AS treatment_procedure_id,
      tp.clinic_id AS tp_clinic_id,
      t.id AS treatment_plan_id,
      t.clinic_id AS plan_clinic_id
    FROM treatment_procedures tp
    JOIN treatment_plans t ON tp.treatment_plan_id = t.id
    WHERE tp.clinic_id != t.clinic_id
  `);
  
  if (verifyD.rows.length > 0) {
    console.log(`      ❌ FOUND ${verifyD.rows.length} CROSS-CLINIC REFERENCES!`);
    console.table(verifyD.rows);
    throw new Error('VERIFICATION FAILED: Cross-clinic references detected in treatment_procedures → treatment_plans');
  } else {
    console.log('      ✓ PASS: 0 cross-clinic references\n');
  }

  // 3. FK Constraint Verification
  console.log('3. FOREIGN KEY CONSTRAINTS:');
  console.log('   ─────────────────────────────────────────────────────────────');
  
  const fks = await db.raw(`
    SELECT 
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      rc.delete_rule,
      rc.update_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'clinic_id'
      AND tc.table_name IN ('procedure_catalog', 'treatment_plans', 'treatment_procedures')
    ORDER BY tc.table_name
  `);
  
  fks.rows.forEach(fk => {
    console.log(`   ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}`);
    console.log(`      ON DELETE: ${fk.delete_rule}, ON UPDATE: ${fk.update_rule}`);
  });

  // 4. Index Verification
  console.log('\n4. INDEXES:');
  console.log('   ─────────────────────────────────────────────────────────────');
  
  const indexes = await db.raw(`
    SELECT 
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('procedure_catalog', 'treatment_plans', 'treatment_procedures')
      AND indexname LIKE '%clinic_id%'
    ORDER BY tablename, indexname
  `);
  
  indexes.rows.forEach(idx => {
    console.log(`   ${idx.tablename}: ${idx.indexname}`);
  });

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  ✓ TX-04 MIGRATION COMPLETED SUCCESSFULLY                     ║');
  console.log('║  ✓ All verifications passed                                   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

} catch (err) {
  console.error('\n❌ Migration failed:', err.message);
  console.error(err.stack);
  process.exit(1);
} finally {
  await db.destroy();
}
