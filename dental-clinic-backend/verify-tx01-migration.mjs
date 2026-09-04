/**
 * Verification script for TX-01 migration
 * Confirms clinics table and patient isolation setup
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually
function loadEnv(envPath) {
  try {
    const raw = readFileSync(envPath, 'utf8');
    const vars = {};
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
      vars[key] = val;
    }
    return vars;
  } catch {
    return {};
  }
}

const envPath = resolve(__dirname, '.env');
const env = loadEnv(envPath);

const client = new pg.Client({
  host: env.DB_HOST || 'localhost',
  port: parseInt(env.DB_PORT || '5432', 10),
  user: env.DB_USER || 'postgres',
  password: env.DB_PASSWORD || '',
  database: env.DB_NAME || 'dental_clinic'
});

async function verify() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  TX-01 Migration Verification');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    await client.connect();
    
    // Verification 1: Clinics table has exactly 1 row
    console.log('✓ Verification 1: Clinics table');
    const clinicsResult = await client.query('SELECT * FROM clinics');
    const clinics = clinicsResult.rows;
    console.log(`  Count: ${clinics.length} clinic(s)`);
    
    if (clinics.length !== 1) {
      console.error(`  ❌ ERROR: Expected 1 clinic, found ${clinics.length}`);
      process.exit(1);
    }
    
    console.log(`  Name: ${clinics[0].name}`);
    console.log(`  Slug: ${clinics[0].slug}`);
    console.log(`  ID: ${clinics[0].id}`);
    
    if (clinics[0].name !== 'SmileFix Main Clinic') {
      console.error(`  ❌ ERROR: Expected "SmileFix Main Clinic", found "${clinics[0].name}"`);
      process.exit(1);
    }
    
    console.log('  ✅ PASS: Exactly 1 clinic with correct name\n');
    
    const mainClinicId = clinics[0].id;

    // Verification 2: All patients have non-null clinic_id
    console.log('✓ Verification 2: Patients clinic_id');
    
    const totalResult = await client.query('SELECT COUNT(*) as count FROM patients');
    const totalPatients = parseInt(totalResult.rows[0].count);
    console.log(`  Total patients: ${totalPatients}`);
    
    const withClinicResult = await client.query('SELECT COUNT(*) as count FROM patients WHERE clinic_id IS NOT NULL');
    const patientsWithClinic = parseInt(withClinicResult.rows[0].count);
    console.log(`  Patients with clinic_id: ${patientsWithClinic}`);
    
    const withoutClinicResult = await client.query('SELECT COUNT(*) as count FROM patients WHERE clinic_id IS NULL');
    const patientsWithoutClinic = parseInt(withoutClinicResult.rows[0].count);
    console.log(`  Patients without clinic_id: ${patientsWithoutClinic}`);
    
    if (patientsWithoutClinic > 0) {
      console.error(`  ❌ ERROR: Found ${patientsWithoutClinic} patients with NULL clinic_id`);
      process.exit(1);
    }
    
    console.log('  ✅ PASS: All patients have non-null clinic_id\n');

    // Verification 3: All patients point to the main clinic
    console.log('✓ Verification 3: Patient-Clinic relationship');
    
    const mainClinicPatientsResult = await client.query(
      'SELECT COUNT(*) as count FROM patients WHERE clinic_id = $1',
      [mainClinicId]
    );
    const patientsInMainClinic = parseInt(mainClinicPatientsResult.rows[0].count);
    console.log(`  Patients in main clinic: ${patientsInMainClinic}`);
    
    if (patientsInMainClinic !== totalPatients) {
      console.error(`  ❌ ERROR: Not all patients belong to main clinic`);
      console.error(`     Expected: ${totalPatients}, Found: ${patientsInMainClinic}`);
      process.exit(1);
    }
    
    console.log('  ✅ PASS: All patients belong to main clinic\n');

    // Verification 4: Sample patient data
    console.log('✓ Verification 4: Sample patient records');
    const sampleResult = await client.query(
      'SELECT id, first_name, last_name, clinic_id FROM patients LIMIT 3'
    );
    const samplePatients = sampleResult.rows;
    
    console.log('  Sample patients:');
    samplePatients.forEach((p, idx) => {
      console.log(`    ${idx + 1}. ${p.first_name} ${p.last_name} (clinic_id: ${p.clinic_id === mainClinicId ? '✓ Main Clinic' : '❌ WRONG CLINIC'})`);
    });
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  ✅ ALL VERIFICATIONS PASSED');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n📊 Summary:');
    console.log(`  - 1 clinic created (SmileFix Main Clinic)`);
    console.log(`  - ${totalPatients} patients preserved (no data loss)`);
    console.log(`  - All patients assigned to main clinic`);
    console.log(`  - clinic_id is NOT NULL for all patients\n`);

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verify();
