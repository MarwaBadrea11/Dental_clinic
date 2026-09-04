-- TX-01 Migration Verification Queries
-- Run with: psql -U postgres -d dental_clinic -f verify-tx01.sql

\echo ''
\echo '═══════════════════════════════════════════════════════'
\echo '  TX-01 Migration Verification'
\echo '═══════════════════════════════════════════════════════'
\echo ''

-- Verification 1: Clinics table has exactly 1 row
\echo '✓ Verification 1: Clinics table'
SELECT 
  COUNT(*) as clinic_count,
  (SELECT name FROM clinics LIMIT 1) as clinic_name,
  (SELECT slug FROM clinics LIMIT 1) as clinic_slug
FROM clinics;

\echo ''

-- Verification 2: All patients have non-null clinic_id  
\echo '✓ Verification 2: Patients clinic_id status'
SELECT 
  COUNT(*) as total_patients,
  COUNT(clinic_id) as patients_with_clinic_id,
  COUNT(*) FILTER (WHERE clinic_id IS NULL) as patients_without_clinic_id
FROM patients;

\echo ''

-- Verification 3: All patients belong to the main clinic
\echo '✓ Verification 3: Patient-Clinic relationship'
SELECT 
  c.name as clinic_name,
  COUNT(p.id) as patient_count
FROM clinics c
LEFT JOIN patients p ON p.clinic_id = c.id
GROUP BY c.id, c.name;

\echo ''

-- Verification 4: Sample patient records
\echo '✓ Verification 4: Sample patient records (first 5)'
SELECT 
  p.first_name || ' ' || p.last_name as patient_name,
  c.name as clinic_name,
  p.clinic_id
FROM patients p
JOIN clinics c ON p.clinic_id = c.id
LIMIT 5;

\echo ''
\echo '═══════════════════════════════════════════════════════'
\echo '  Verification Complete'
\echo '═══════════════════════════════════════════════════════'
\echo ''
