/**
 * TX-02: Backfill clinic_id for existing users (step 2 of 3)
 * 
 * Assign all existing users to SmileFix Main Clinic.
 * This includes ALL roles: ADMIN, DENTIST, RECEPTIONIST, PATIENT
 * 
 * Note: ADMIN multi-clinic access is a known limitation to be addressed
 * in a future phase after TX-02 completes. For now, ADMIN is treated like
 * any other role (single-clinic scoped).
 */
export async function up(knex) {
  // Get the main clinic ID
  const mainClinic = await knex('clinics')
    .where({ slug: 'smilefix-main-clinic' })
    .first('id');
  
  if (!mainClinic) {
    throw new Error('Main clinic not found - cannot backfill users. Run clinic migrations first.');
  }
  
  // Update all users to belong to main clinic
  const updatedCount = await knex('users')
    .whereNull('clinic_id')
    .update({ clinic_id: mainClinic.id });
  
  console.log(`✓ Backfilled ${updatedCount} users to SmileFix Main Clinic (${mainClinic.id})`);
}

export async function down(knex) {
  // Set all clinic_id back to NULL
  const resetCount = await knex('users').update({ clinic_id: null });
  console.log(`✓ Reset ${resetCount} users clinic_id to NULL`);
}
