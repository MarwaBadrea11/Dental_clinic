/**
 * Cleanup Test Data Script
 * Removes leftover test clinics and patients from the database
 */

import { db } from './src/db/db.js';

async function cleanupTestData() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Cleaning Up Test Data');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // Delete test patients (must delete first due to FK constraint)
    const deletedPatients = await db('patients')
      .where('first_name', 'LIKE', 'TestPatient%')
      .orWhere('first_name', 'LIKE', 'NewPatient%')
      .orWhere('first_name', 'LIKE', 'UpdatedName%')
      .del();
    
    console.log(`✓ Deleted ${deletedPatients} test patient(s)`);

    // Delete test clinics
    const deletedClinics = await db('clinics')
      .where('slug', 'LIKE', 'test-clinic-%')
      .del();
    
    console.log(`✓ Deleted ${deletedClinics} test clinic(s)`);

    // Verify final state
    const clinicCount = await db('clinics').count('* as count').first();
    const patientCount = await db('patients').whereNull('deleted_at').count('* as count').first();

    console.log('\n─── Final State ───');
    console.log(`Total clinics: ${clinicCount.count}`);
    console.log(`Active patients: ${patientCount.count}`);

    if (clinicCount.count === '1') {
      const mainClinic = await db('clinics').first();
      console.log(`✓ Main clinic: ${mainClinic.name} (${mainClinic.slug})`);
    }

    console.log('\n✅ Cleanup complete');
  } catch (err) {
    console.error('❌ Cleanup failed:', err.message);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

cleanupTestData();
