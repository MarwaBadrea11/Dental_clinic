/**
 * TX-01: Clinic Isolation Tests for Patients Module
 * 
 * These tests prove that clinic data isolation works:
 * - Clinic A can ONLY see Clinic A's patients
 * - Clinic B can ONLY see Clinic B's patients
 * - Cross-clinic access returns 404 (explicit denial, not silent filter)
 * 
 * This serves as the template for TX-02 (all modules).
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../app.js';
import { signAccessToken } from '../../utils/token.js';

describe('TX-01: Clinic Isolation - Patients Module', () => {
  let app;
  let db;
  let adminToken;
  
  // Test clinics
  let clinicA;
  let clinicB;
  
  // Test patients
  let patientInClinicA;
  let patientInClinicB;

  beforeAll(async () => {
    app = await buildApp();
    db = app.db;  // Fixed: app.db not app.knex
    
    // Create admin token for testing
    adminToken = signAccessToken({
      sub: '00000000-0000-0000-0000-000000000001',
      role: 'ADMIN',
      permissions: ['*']
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    // Clean up test data (patients first, then clinics due to FK constraint)
    // Delete both soft-deleted and active test patients (hard delete to avoid FK issues)
    await db('patients').where('first_name', 'LIKE', 'TestPatient%').del();
    await db('patients').where('first_name', 'LIKE', 'NewPatient%').del();
    await db('patients').where('first_name', 'LIKE', 'UpdatedName%').del();
    
    await db('clinics').where('slug', 'LIKE', 'test-clinic-%').del();
    
    // Create two test clinics
    [clinicA] = await db('clinics')
      .insert({
        name: 'Test Clinic A',
        slug: 'test-clinic-a'
      })
      .returning('*');
    
    [clinicB] = await db('clinics')
      .insert({
        name: 'Test Clinic B',
        slug: 'test-clinic-b'
      })
      .returning('*');
    
    // Create a patient in Clinic A
    [patientInClinicA] = await db('patients')
      .insert({
        clinic_id: clinicA.id,
        first_name: 'TestPatientA',
        last_name: 'ClinicA',
        date_of_birth: '1990-01-01',
        gender: 'male',
        national_id: `TEST-A-${Date.now()}`,
        phone: '+1234567890'
      })
      .returning('*');
    
    // Create a patient in Clinic B
    [patientInClinicB] = await db('patients')
      .insert({
        clinic_id: clinicB.id,
        first_name: 'TestPatientB',
        last_name: 'ClinicB',
        date_of_birth: '1990-01-01',
        gender: 'female',
        national_id: `TEST-B-${Date.now()}`,
        phone: '+0987654321'
      })
      .returning('*');
  });

  describe('GET /api/v1/patients (List)', () => {
    it('should return ONLY Clinic A patients when X-Clinic-ID is Clinic A', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/patients',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'X-Clinic-ID': clinicA.id
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

    it('should return ONLY Clinic B patients when X-Clinic-ID is Clinic B', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/patients',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'X-Clinic-ID': clinicB.id
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
        url: `/api/v1/patients/${patientInClinicA.id}`,
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'X-Clinic-ID': clinicA.id  // Same clinic
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(patientInClinicA.id);
      expect(body.data.first_name).toBe('TestPatientA');
    });

    it('🔒 ISOLATION TEST: should return 404 when requesting from DIFFERENT clinic', async () => {
      // THIS IS THE CRITICAL TEST - Clinic B trying to access Clinic A's patient
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/patients/${patientInClinicA.id}`,  // Clinic A's patient
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'X-Clinic-ID': clinicB.id  // But requesting as Clinic B
        }
      });

      // MUST return 404 (explicit denial), NOT 200 with filtered data
      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('not found');
    });

    it('🔒 ISOLATION TEST: Clinic A cannot access Clinic B patient', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/patients/${patientInClinicB.id}`,  // Clinic B's patient
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'X-Clinic-ID': clinicA.id  // But requesting as Clinic A
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
        url: `/api/v1/patients/${patientInClinicA.id}`,
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'X-Clinic-ID': clinicA.id
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
        url: `/api/v1/patients/${patientInClinicA.id}`,  // Clinic A's patient
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'X-Clinic-ID': clinicB.id  // But updating as Clinic B
        },
        payload: {
          first_name: 'HackedName'
        }
      });

      expect(response.statusCode).toBe(404);
      
      // Verify patient was NOT updated
      const patient = await db('patients').where({ id: patientInClinicA.id }).first();
      expect(patient.first_name).toBe('TestPatientA');  // Original name unchanged
    });
  });

  describe('DELETE /api/v1/patients/:id (Delete)', () => {
    it('should delete patient when requesting from SAME clinic', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/patients/${patientInClinicA.id}`,
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'X-Clinic-ID': clinicA.id
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
        url: `/api/v1/patients/${patientInClinicA.id}`,  // Clinic A's patient
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'X-Clinic-ID': clinicB.id  // But deleting as Clinic B
        }
      });

      expect(response.statusCode).toBe(404);
      
      // Verify patient was NOT deleted
      const patient = await db('patients').where({ id: patientInClinicA.id }).first();
      expect(patient.deleted_at).toBeNull();  // Still not deleted
    });
  });

  describe('POST /api/v1/patients (Create)', () => {
    it('should create patient in the correct clinic', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/patients',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'X-Clinic-ID': clinicA.id
        },
        payload: {
          first_name: 'NewPatient',
          last_name: 'InClinicA',
          date_of_birth: '1995-05-05',
          gender: 'male',
          national_id: `NEW-A-${Date.now()}`,
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
        url: `/api/v1/patients/${body.data.id}`,
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'X-Clinic-ID': clinicA.id
        }
      });
      expect(visibleToA.statusCode).toBe(200);
      
      // Verify it's NOT visible to Clinic B
      const visibleToB = await app.inject({
        method: 'GET',
        url: `/api/v1/patients/${body.data.id}`,
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'X-Clinic-ID': clinicB.id
        }
      });
      expect(visibleToB.statusCode).toBe(404);
    });
  });
});
