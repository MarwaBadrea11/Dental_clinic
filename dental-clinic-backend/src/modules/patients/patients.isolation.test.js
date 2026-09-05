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
    // Clean up test data (patients → users → clinics, respecting FK constraints)
    await db('patients').where('first_name', 'LIKE', 'TestPatient%').del();
    await db('patients').where('first_name', 'LIKE', 'NewPatient%').del();
    await db('patients').where('first_name', 'LIKE', 'UpdatedName%').del();
    
    await db('users').where('email', 'LIKE', 'test-clinic-%').del();
    await db('clinics').where('slug', 'LIKE', 'test-clinic-%').del();
    
    // Create two test clinics
    const clinicsA = await db('clinics')
      .insert({
        name: 'Test Clinic A',
        slug: 'test-clinic-a'
      })
      .returning('*');
    clinicA = clinicsA[0];
    
    const clinicsB = await db('clinics')
      .insert({
        name: 'Test Clinic B',
        slug: 'test-clinic-b'
      })
      .returning('*');
    clinicB = clinicsB[0];
    
    // Hash password for test users
    const password_hash = await bcrypt.hash('password123', 12);
    
    // Create admin user for Clinic A
    const usersA = await db('users')
      .insert({
        username: 'admin-clinic-a',
        email: 'test-clinic-a-admin@test.local',
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
        username: 'admin-clinic-b',
        email: 'test-clinic-b-admin@test.local',
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
        email: 'test-clinic-a-admin@test.local',
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
        email: 'test-clinic-b-admin@test.local',
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
        first_name: 'TestPatientA',
        last_name: 'ClinicA',
        date_of_birth: '1990-01-01',
        gender: 'male',
        national_id: 'TEST-A-' + Date.now(),
        phone: '+1234567890'
      })
      .returning('*');
    patientInClinicA = patientsA[0];
    
    // Create a patient in Clinic B
    const patientsB = await db('patients')
      .insert({
        clinic_id: clinicB.id,
        first_name: 'TestPatientB',
        last_name: 'ClinicB',
        date_of_birth: '1990-01-01',
        gender: 'female',
        national_id: 'TEST-B-' + Date.now(),
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
      expect(body.data.first_name).toBe('TestPatientA');
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
      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/patients/' + patientInClinicA.id,
        headers: {
          'Authorization': 'Bearer ' + tokenClinicB
        },
        payload: {
          first_name: 'HackedName'
        }
      });

      expect(response.statusCode).toBe(404);
      
      // Verify patient was NOT updated
      const patient = await db('patients').where({ id: patientInClinicA.id }).first();
      expect(patient.first_name).toBe('TestPatientA');
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
          first_name: 'NewPatient',
          last_name: 'InClinicA',
          date_of_birth: '1995-05-05',
          gender: 'male',
          national_id: 'NEW-A-' + Date.now(),
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
