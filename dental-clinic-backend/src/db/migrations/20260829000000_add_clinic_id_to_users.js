/**
 * TX-02: Add clinic_id to users table (step 1 of 3 - make nullable)
 * 
 * Pattern: nullable → backfill → NOT NULL
 * This is step 1: Add column as NULLABLE to allow backfill in next migration
 * 
 * IMPORTANT: All user roles (ADMIN, DENTIST, RECEPTIONIST, PATIENT) will be
 * scoped to a single clinic. ADMIN cross-clinic access is a known limitation
 * documented in TX-02_PROGRESS.md for future implementation.
 */
export async function up(knex) {
  await knex.schema.table('users', (t) => {
    t.uuid('clinic_id')
      .nullable()
      .references('id')
      .inTable('clinics')
      .onDelete('RESTRICT')  // Don't allow deleting a clinic if users exist
      .onUpdate('CASCADE');
    
    t.index('clinic_id');  // Index for filtering queries
  });
  
  console.log('✓ Added clinic_id column to users table (nullable)');
}

export async function down(knex) {
  await knex.schema.table('users', (t) => {
    t.dropColumn('clinic_id');
  });
  
  console.log('✓ Removed clinic_id column from users table');
}
