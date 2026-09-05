/**
 * TX-02: Clinic Isolation Tests for Patients Module (JWT-Based)
 * 
 * These tests prove that clinic data isolation works with JWT-based resolution:
 * - Creates real users in different clinics
 * - Uses real login tokens (not fake headers)
 * - Clinic A can ONLY see Clinic A's patients
 * - Clinic B can ONLY see Clinic B's patients
 * - Cross-clinic access returns 404 (explicit denial, not silent filter)
 * 
 * This serves as the template for TX-02 (all modules).
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../app.js';
import bcrypt from 'bcrypt';

describe('TX-02: Clinic Isolation - Patients Module (JWT-Based)', () => {
  let app;
  let db;
  
  // Test clinics
  let clinicA;
  let clinicB;
  
  // Test users (one admin per clinic for testing)
  let userClinicA;
  let userClinicB;
  
  // Auth tokens
  let tokenClinicA;
  let tokenClinicB;
  
  // Test patients
  let patientInClinicA;
  let patientInClinicB;

  beforeAll(async () => {
    app = await buildApp();
    db = app.db;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    // Clean up ONLY this test file's data (unique prefixes to avoid interference with appointments tests)
    // FK order: appointments → patients → users → clinics
    
    // Delete appointments referencing this file's patients FIRST
    await db('appointments').whereIn('patient_id', 
      db('patients').select('id').where('first_name', 'LIKE', 'TXO2Patient%')
    ).del();
    await db('appointments').whereIn('patient_id',
      db('patients').select('id').where('first_name', 'LIKE', 'TXO2NewPatient%')
    ).del();
    await db('appointments').whereIn('patient_id',
      db('patients').select('id').where('first_name', 'LIKE', 'UpdatedName%')
    ).del();
    
    // Delete this file's patients SECOND (including updated names)
    await db('patients').where('first_name', 'LIKE', 'TXO2Patient%').del();
    await db('patients').where('first_name', 'LIKE', 'TXO2NewPatient%').del();
    await db('patients').where('first_name', 'LIKE', 'TXO2UpdatedName%').del();
    await db('patients').where('first_name', 'LIKE', 'UpdatedName%').del();  // Catch any variants
    
    // Delete this file's users THIRD
    await db('users').where('email', 'LIKE', 'txo2-patients-%').del();
    
    // Delete this file's clinics LAST
    await db('clinics').where('slug', 'LIKE', 'txo2-patients-%').del();
    
    // Create two test clinics (unique to this test file)
    const clinicsA = await db('clinics')
      .insert({
        name: 'TXO2 Patients Clinic A',
        slug: 'txo2-patients-clinic-a'
      })
      .returning('*');
    clinicA = clinicsA[0];
    
    const clinicsB = await db('clinics')
      .insert({
        name: 'TXO2 Patients Clinic B',
        slug: 'txo2-patients-clinic-b'
      })
      .returning('*');
    clinicB = clinicsB[0];
    
    // Hash password for test users
    const password_hash = await bcrypt.hash('password123', 12);
    
    // Create admin user for Clinic A
    const usersA = await db('users')
      .insert({
        username: 'txo2-patients-admin-a',
        email: 'txo2-patients-a-admin@test.local',
        password_hash,
        role: 'ADMIN',
        clinic_id: clinicA.id,
        is_active: true
      })
      .returning('*');
    userClinicA = usersA[0];
    
    // Create admin user for Clinic B
    const usersB = await db('users')
      .insert({
        username: 'txo2-patients-admin-b',
        email: 'txo2-patients-b-admin@test.local',
        password_hash,
        role: 'ADMIN',
        clinic_id: clinicB.id,
        is_active: true
      })
      .returning('*');
    userClinicB = usersB[0];
    
    // Login as Clinic A admin to get real JWT token
    const loginA = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'txo2-patients-a-admin@test.local',
        password: 'password123'
      }
    });
    const loginABody = JSON.parse(loginA.body);
    if (!loginABody.success || !loginABody.data) {
      throw new Error(`Login failed for Clinic A: ${JSON.stringify(loginABody)}`);
    }
    tokenClinicA = loginABody.data.accessToken;
    
    // Login as Clinic B admin to get real JWT token
    const loginB = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'txo2-patients-b-admin@test.local',
        password: 'password123'
      }
    });
    const loginBBody = JSON.parse(loginB.body);
    if (!loginBBody.success || !loginBBody.data) {
      throw new Error(`Login failed for Clinic B: ${JSON.stringify(loginBBody)}`);
    }
    tokenClinicB = loginBBody.data.accessToken;
    
    // Create a patient in Clinic A
    const patientsA = await db('patients')
      .insert({
        clinic_id: clinicA.id,
        first_name: 'TXO2PatientA',
        last_name: 'ClinicA',
        date_of_birth: '1990-01-01',
        gender: 'male',
        national_id: 'TXO2-PATIENTS-A-' + Date.now(),
        phone: '+1234567890'
      })
      .returning('*');
    patientInClinicA = patientsA[0];
    
    // Create a patient in Clinic B
    const patientsB = await db('patients')
      .insert({
        clinic_id: clinicB.id,
        first_name: 'TXO2PatientB',
        last_name: 'ClinicB',
        date_of_birth: '1990-01-01',
        gender: 'female',
        national_id: 'TXO2-PATIENTS-B-' + Date.now(),
        phone: '+0987654321'
      })
      .returning('*');
    patientInClinicB = patientsB[0];
  });

  describe('GET /api/v1/patients (List)', () => {
    it('should return ONLY Clinic A patients when authenticated as Clinic A user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/patients',
        headers: {
          'Authorization': 'Bearer ' + tokenClinicA
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      
      // Should only see Clinic A's patient
      const patientIds = body.data.map(p => p.id);
      expect(patientIds).toContain(patientInClinicA.id);
      expect(patientIds).not.toContain(patientInClinicB.id);
    });

    it('should return ONLY Clinic B patients when authenticated as Clinic B user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/patients',
        headers: {
          'Authorization': 'Bearer ' + tokenClinicB
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      
      // Should only see Clinic B's patient
      const patientIds = body.data.map(p => p.id);
      expect(patientIds).toContain(patientInClinicB.id);
      expect(patientIds).not.toContain(patientInClinicA.id);
    });
  });

  describe('GET /api/v1/patients/:id (Get Single Patient)', () => {
    it('should return patient when requesting from SAME clinic', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/patients/' + patientInClinicA.id,
        headers: {
          'Authorization': 'Bearer ' + tokenClinicA
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(patientInClinicA.id);
      expect(body.data.first_name).toBe('TXO2PatientA');
    });

    it('🔒 ISOLATION TEST: should return 404 when requesting from DIFFERENT clinic', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/patients/' + patientInClinicA.id,
        headers: {
          'Authorization': 'Bearer ' + tokenClinicB
        }
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('not found');
    });

    it('🔒 ISOLATION TEST: Clinic A cannot access Clinic B patient', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/patients/' + patientInClinicB.id,
        headers: {
          'Authorization': 'Bearer ' + tokenClinicA
        }
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/patients/:id (Update)', () => {
    it('should update patient when requesting from SAME clinic', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/patients/' + patientInClinicA.id,
        headers: {
          'Authorization': 'Bearer ' + tokenClinicA
        },
        payload: {
          first_name: 'UpdatedNameA'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.first_name).toBe('UpdatedNameA');
    });

    it('🔒 ISOLATION TEST: should return 404 when updating from DIFFERENT clinic', async () => {
      // Use the shared patient from beforeEach, but check if it still exists first
      let testPatient = await db('patients').where({ id: patientInClinicA.id }).first();
      
      // If it was deleted by a previous test, create a fresh one
      if (!testPatient) {
        const freshPatients = await db('patients')
          .insert({
            clinic_id: clinicA.id,
            first_name: 'TXO2PatientA',
            last_name: 'ClinicA',
            date_of_birth: '1990-01-01',
            gender: 'male',
            national_id: 'TXO2-PATIENTS-A-FRESH-' + Date.now(),
            phone: '+1234567890'
          })
          .returning('*');
        testPatient = freshPatients[0];
      }
      
      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/patients/' + testPatient.id,
        headers: {
          'Authorization': 'Bearer ' + tokenClinicB
        },
        payload: {
          first_name: 'HackedName'
        }
      });

      expect(response.statusCode).toBe(404);
      
      // Verify patient was NOT updated
      const patient = await db('patients').where({ id: testPatient.id }).first();
      expect(patient.first_name).toBe('TXO2PatientA');
    });
  });

  describe('DELETE /api/v1/patients/:id (Delete)', () => {
    it('should delete patient when requesting from SAME clinic', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/patients/' + patientInClinicA.id,
        headers: {
          'Authorization': 'Bearer ' + tokenClinicA
        }
      });

      expect(response.statusCode).toBe(200);
      
      // Verify soft delete
      const patient = await db('patients').where({ id: patientInClinicA.id }).first();
      expect(patient.deleted_at).not.toBeNull();
    });

    it('🔒 ISOLATION TEST: should return 404 when deleting from DIFFERENT clinic', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/patients/' + patientInClinicA.id,
        headers: {
          'Authorization': 'Bearer ' + tokenClinicB
        }
      });

      expect(response.statusCode).toBe(404);
      
      // Verify patient was NOT deleted
      const patient = await db('patients').where({ id: patientInClinicA.id }).first();
      expect(patient.deleted_at).toBeNull();
    });
  });

  describe('POST /api/v1/patients (Create)', () => {
    it('should create patient in the correct clinic', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/patients',
        headers: {
          'Authorization': 'Bearer ' + tokenClinicA
        },
        payload: {
          first_name: 'TXO2NewPatient',
          last_name: 'InClinicA',
          date_of_birth: '1995-05-05',
          gender: 'male',
          national_id: 'TXO2-NEW-A-' + Date.now(),
          phone: '+1111111111'
        }
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      
      // Verify patient was created in Clinic A
      expect(body.data.clinic_id).toBe(clinicA.id);
      
      // Verify it's only visible to Clinic A
      const visibleToA = await app.inject({
        method: 'GET',
        url: '/api/v1/patients/' + body.data.id,
        headers: {
          'Authorization': 'Bearer ' + tokenClinicA
        }
      });
      expect(visibleToA.statusCode).toBe(200);
      
      // Verify it's NOT visible to Clinic B
      const visibleToB = await app.inject({
        method: 'GET',
        url: '/api/v1/patients/' + body.data.id,
        headers: {
          'Authorization': 'Bearer ' + tokenClinicB
        }
      });
      expect(visibleToB.statusCode).toBe(404);
    });
  });
});
