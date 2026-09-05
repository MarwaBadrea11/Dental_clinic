/**
 * TX-03: Clinic Isolation Tests for Appointments Module (JWT-Based)
 * 
 * These tests prove that clinic data isolation works for appointments:
 * - Creates two clinics with their own dentists, patients, and appointments
 * - Uses real login tokens (not fake headers)
 * - Clinic A can ONLY see/modify Clinic A's appointments
 * - Clinic B can ONLY see/modify Clinic B's appointments
 * - Cross-clinic access returns 404 (explicit denial, not silent filter)
 * - Cross-clinic reference attacks are blocked (validateClinicReferences)
 * - Conflict detection is scoped by clinic (no false conflicts across clinics)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../app.js';
import bcrypt from 'bcrypt';

describe('TX-03: Clinic Isolation - Appointments Module (JWT-Based)', () => {
  let app;
  let db;
  
  // Test clinics
  let clinicA;
  let clinicB;
  
  // Test users (dentists)
  let dentistClinicA;
  let dentistClinicB;
  
  // Auth tokens
  let tokenClinicA;
  let tokenClinicB;
  
  // Test patients
  let patientInClinicA;
  let patientInClinicB;
  
  // Test appointments
  let appointmentInClinicA;
  let appointmentInClinicB;

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
    // Clean up ONLY this test file's data (unique prefixes to avoid interference with patients tests)
    // FK order: appointments → patients → users → clinics
    
    // Delete this file's appointments
    await db('appointments').where('notes', 'LIKE', 'TXO3-%').del();
    await db('appointments').whereIn('patient_id', 
      db('patients').select('id').where('first_name', 'LIKE', 'TXO3Patient%')
    ).del();
    
    // Delete this file's patients
    await db('patients').where('first_name', 'LIKE', 'TXO3Patient%').del();
    
    // Delete this file's users
    await db('users').where('email', 'LIKE', 'txo3-appt-%').del();
    
    // Delete this file's clinics
    await db('clinics').where('slug', 'LIKE', 'txo3-appt-%').del();
    
    // Create two test clinics (unique to this test file)
    const clinicsA = await db('clinics')
      .insert({
        name: 'TXO3 Appointments Clinic A',
        slug: 'txo3-appt-clinic-a'
      })
      .returning('*');
    clinicA = clinicsA[0];
    
    const clinicsB = await db('clinics')
      .insert({
        name: 'TXO3 Appointments Clinic B',
        slug: 'txo3-appt-clinic-b'
      })
      .returning('*');
    clinicB = clinicsB[0];
    
    // Hash password for test users
    const password_hash = await bcrypt.hash('password123', 12);
    
    // Create dentist user for Clinic A
    const dentistsA = await db('users')
      .insert({
        username: 'txo3-appt-dentist-a',
        email: 'txo3-appt-dentist-a@test.local',
        password_hash,
        role: 'DENTIST',
        clinic_id: clinicA.id,
        is_active: true
      })
      .returning('*');
    dentistClinicA = dentistsA[0];
    
    // Create dentist user for Clinic B
    const dentistsB = await db('users')
      .insert({
        username: 'txo3-appt-dentist-b',
        email: 'txo3-appt-dentist-b@test.local',
        password_hash,
        role: 'DENTIST',
        clinic_id: clinicB.id,
        is_active: true
      })
      .returning('*');
    dentistClinicB = dentistsB[0];
    
    // Login as Clinic A dentist to get real JWT token
    const loginA = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'txo3-appt-dentist-a@test.local',
        password: 'password123'
      }
    });
    const loginABody = JSON.parse(loginA.body);
    if (!loginABody.success || !loginABody.data) {
      throw new Error(`Login failed for Clinic A dentist: ${JSON.stringify(loginABody)}`);
    }
    tokenClinicA = loginABody.data.accessToken;
    
    // Login as Clinic B dentist to get real JWT token
    const loginB = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'txo3-appt-dentist-b@test.local',
        password: 'password123'
      }
    });
    const loginBBody = JSON.parse(loginB.body);
    if (!loginBBody.success || !loginBBody.data) {
      throw new Error(`Login failed for Clinic B dentist: ${JSON.stringify(loginBBody)}`);
    }
    tokenClinicB = loginBBody.data.accessToken;
    
    // Create a patient in Clinic A
    const patientsA = await db('patients')
      .insert({
        clinic_id: clinicA.id,
        first_name: 'TXO3PatientA',
        last_name: 'ApptClinicA',
        date_of_birth: '1990-01-01',
        gender: 'male',
        national_id: 'TXO3-APPT-A-' + Date.now(),
        phone: '+1234567890'
      })
      .returning('*');
    patientInClinicA = patientsA[0];
    
    // Create a patient in Clinic B
    const patientsB = await db('patients')
      .insert({
        clinic_id: clinicB.id,
        first_name: 'TXO3PatientB',
        last_name: 'ApptClinicB',
        date_of_birth: '1990-01-01',
        gender: 'female',
        national_id: 'TXO3-APPT-B-' + Date.now(),
        phone: '+0987654321'
      })
      .returning('*');
    patientInClinicB = patientsB[0];
    
    // Create an appointment in Clinic A
    const appointmentsA = await db('appointments')
      .insert({
        clinic_id: clinicA.id,
        patient_id: patientInClinicA.id,
        dentist_id: dentistClinicA.id,
        scheduled_at: new Date(Date.now() + 86400000), // tomorrow
        duration_minutes: 60,
        status: 'SCHEDULED',
        notes: 'TXO3-A-APPOINTMENT'
      })
      .returning('*');
    appointmentInClinicA = appointmentsA[0];
    
    // Create an appointment in Clinic B
    const appointmentsB = await db('appointments')
      .insert({
        clinic_id: clinicB.id,
        patient_id: patientInClinicB.id,
        dentist_id: dentistClinicB.id,
        scheduled_at: new Date(Date.now() + 86400000), // tomorrow
        duration_minutes: 60,
        status: 'SCHEDULED',
        notes: 'TXO3-B-APPOINTMENT'
      })
      .returning('*');
    appointmentInClinicB = appointmentsB[0];
  });

  describe('GET /api/v1/appointments (List)', () => {
    it('should return ONLY Clinic A appointments when authenticated as Clinic A user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/appointments',
        headers: {
          'Authorization': 'Bearer ' + tokenClinicA
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      
      // Should only see Clinic A's appointment
      const appointmentIds = body.data.appointments.map(a => a.id);
      expect(appointmentIds).toContain(appointmentInClinicA.id);
      expect(appointmentIds).not.toContain(appointmentInClinicB.id);
    });

    it('should return ONLY Clinic B appointments when authenticated as Clinic B user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/appointments',
        headers: {
          'Authorization': 'Bearer ' + tokenClinicB
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      
      // Should only see Clinic B's appointment
      const appointmentIds = body.data.appointments.map(a => a.id);
      expect(appointmentIds).toContain(appointmentInClinicB.id);
      expect(appointmentIds).not.toContain(appointmentInClinicA.id);
    });
  });

  describe('GET /api/v1/appointments/:id (Get Single Appointment)', () => {
    it('should return appointment when requesting from SAME clinic', async () => {
      // Check if shared appointment still exists, create fresh one if needed
      let testAppt = await db('appointments').where({ id: appointmentInClinicA.id }).first();
      
      if (!testAppt) {
        const freshAppts = await db('appointments')
          .insert({
            clinic_id: clinicA.id,
            patient_id: patientInClinicA.id,
            dentist_id: dentistClinicA.id,
            scheduled_at: new Date(Date.now() + 86400000),
            duration_minutes: 60,
            status: 'SCHEDULED',
            notes: 'TXO3-A-APPOINTMENT-FRESH'
          })
          .returning('*');
        testAppt = freshAppts[0];
      }
      
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/appointments/' + testAppt.id,
        headers: {
          'Authorization': 'Bearer ' + tokenClinicA
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(testAppt.id);
    });

    it('🔒 ISOLATION TEST: should return 404 when requesting from DIFFERENT clinic', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/appointments/' + appointmentInClinicA.id,
        headers: {
          'Authorization': 'Bearer ' + tokenClinicB
        }
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('not found');
    });

    it('🔒 ISOLATION TEST: Clinic A cannot access Clinic B appointment', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/appointments/' + appointmentInClinicB.id,
        headers: {
          'Authorization': 'Bearer ' + tokenClinicA
        }
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/appointments/:id (Update)', () => {
    it('should update appointment when requesting from SAME clinic', async () => {
      // Create a fresh appointment for this test
      const freshAppt = await db('appointments')
        .insert({
          clinic_id: clinicA.id,
          patient_id: patientInClinicA.id,
          dentist_id: dentistClinicA.id,
          scheduled_at: new Date(Date.now() + 5 * 86400000),
          duration_minutes: 60,
          status: 'SCHEDULED',
          notes: 'TXO3-UPDATE-TARGET'
        })
        .returning('*');
      
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/appointments/' + freshAppt[0].id,
        headers: {
          'Authorization': 'Bearer ' + tokenClinicA
        },
        payload: {
          notes: 'UPDATED-A-APPOINTMENT'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.notes).toBe('UPDATED-A-APPOINTMENT');
    });

    it('🔒 ISOLATION TEST: should return 404 when updating from DIFFERENT clinic', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/appointments/' + appointmentInClinicA.id,
        headers: {
          'Authorization': 'Bearer ' + tokenClinicB
        },
        payload: {
          notes: 'HACKED-APPOINTMENT'
        }
      });

      expect(response.statusCode).toBe(404);
      
      // Verify appointment was NOT updated
      const appointment = await db('appointments').where({ id: appointmentInClinicA.id }).first();
      expect(appointment.notes).toBe('TXO3-A-APPOINTMENT');
    });
  });

  describe('DELETE /api/v1/appointments/:id (Delete)', () => {
    it('should delete appointment when requesting from SAME clinic', async () => {
      // Note: DENTIST role may not have delete permission - this tests clinic isolation, not RBAC
      // If DENTIST cannot delete, we'd need ADMIN role for this test
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/appointments/' + appointmentInClinicA.id,
        headers: {
          'Authorization': 'Bearer ' + tokenClinicA
        }
      });

      // Accept either 200 (deleted) or 403 (DENTIST lacks permission)
      // The isolation test below is the critical one - it must be 404, not 403
      expect([200, 403]).toContain(response.statusCode);
      
      if (response.statusCode === 200) {
        // Verify hard delete if it succeeded
        const appointment = await db('appointments').where({ id: appointmentInClinicA.id }).first();
        expect(appointment).toBeUndefined();
      }
    });

    it('🔒 ISOLATION TEST: should return 404 when deleting from DIFFERENT clinic', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/appointments/' + appointmentInClinicA.id,
        headers: {
          'Authorization': 'Bearer ' + tokenClinicB
        }
      });

      expect(response.statusCode).toBe(404);
      
      // Verify appointment was NOT deleted
      const appointment = await db('appointments').where({ id: appointmentInClinicA.id }).first();
      expect(appointment).toBeDefined();
      expect(appointment.notes).toBe('TXO3-A-APPOINTMENT');
    });
  });

  describe('POST /api/v1/appointments (Create)', () => {
    it('should create appointment in the correct clinic', async () => {
      const tomorrow = new Date(Date.now() + 2 * 86400000); // day after tomorrow
      
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/appointments',
        headers: {
          'Authorization': 'Bearer ' + tokenClinicA
        },
        payload: {
          patient_id: patientInClinicA.id,
          dentist_id: dentistClinicA.id,
          scheduled_at: tomorrow.toISOString(),
          duration_minutes: 30,
          chair_number: '1',  // String, not number
          notes: 'TXO3-NEW-A-APPOINTMENT'
        }
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      
      // Verify appointment was created in Clinic A
      const dbAppointment = await db('appointments').where({ id: body.data.id }).first();
      expect(dbAppointment.clinic_id).toBe(clinicA.id);
      
      // Verify it's only visible to Clinic A
      const visibleToA = await app.inject({
        method: 'GET',
        url: '/api/v1/appointments/' + body.data.id,
        headers: {
          'Authorization': 'Bearer ' + tokenClinicA
        }
      });
      expect(visibleToA.statusCode).toBe(200);
      
      // Verify it's NOT visible to Clinic B
      const visibleToB = await app.inject({
        method: 'GET',
        url: '/api/v1/appointments/' + body.data.id,
        headers: {
          'Authorization': 'Bearer ' + tokenClinicB
        }
      });
      expect(visibleToB.statusCode).toBe(404);
    });

    it('🔒 CROSS-CLINIC REFERENCE ATTACK: should reject appointment with Clinic B patient_id', async () => {
      const tomorrow = new Date(Date.now() + 2 * 86400000);
      
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/appointments',
        headers: {
          'Authorization': 'Bearer ' + tokenClinicA
        },
        payload: {
          patient_id: patientInClinicB.id,  // ⚠️ Cross-clinic reference attack
          dentist_id: dentistClinicA.id,
          scheduled_at: tomorrow.toISOString(),
          duration_minutes: 30,
          chair_number: '2'  // String, not number
        }
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Patient not found or does not belong to your clinic');
    });

    it('🔒 CROSS-CLINIC REFERENCE ATTACK: should reject appointment with Clinic B dentist_id', async () => {
      const tomorrow = new Date(Date.now() + 2 * 86400000);
      
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/appointments',
        headers: {
          'Authorization': 'Bearer ' + tokenClinicA
        },
        payload: {
          patient_id: patientInClinicA.id,
          dentist_id: dentistClinicB.id,  // ⚠️ Cross-clinic reference attack
          scheduled_at: tomorrow.toISOString(),
          duration_minutes: 30,
          chair_number: '3'  // String, not number
        }
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Dentist not found or does not belong to your clinic');
    });
  });

  describe('Conflict Detection - Clinic Scoping', () => {
    it('🔒 ISOLATION TEST: should NOT report false conflicts for same dentist/time/chair in DIFFERENT clinics', async () => {
      // Both clinics book the SAME dentist username pattern, SAME time, SAME chair
      // This should NOT conflict because they're in different clinics
      const sharedTime = new Date(Date.now() + 3 * 86400000);
      const sharedChair = '5';  // String, not number
      
      // Clinic A books dentist A at shared time/chair
      const responseA = await app.inject({
        method: 'POST',
        url: '/api/v1/appointments',
        headers: {
          'Authorization': 'Bearer ' + tokenClinicA
        },
        payload: {
          patient_id: patientInClinicA.id,
          dentist_id: dentistClinicA.id,
          scheduled_at: sharedTime.toISOString(),
          duration_minutes: 45,
          chair_number: sharedChair
        }
      });

      expect(responseA.statusCode).toBe(201);
      const bodyA = JSON.parse(responseA.body);
      expect(bodyA.success).toBe(true);
      
      // Clinic B books dentist B at SAME time/chair (different clinic)
      const responseB = await app.inject({
        method: 'POST',
        url: '/api/v1/appointments',
        headers: {
          'Authorization': 'Bearer ' + tokenClinicB
        },
        payload: {
          patient_id: patientInClinicB.id,
          dentist_id: dentistClinicB.id,
          scheduled_at: sharedTime.toISOString(),
          duration_minutes: 45,
          chair_number: sharedChair
        }
      });

      // Should succeed - no conflict across clinics
      expect(responseB.statusCode).toBe(201);
      const bodyB = JSON.parse(responseB.body);
      expect(bodyB.success).toBe(true);
      
      // Verify both appointments exist
      const apptA = await db('appointments').where({ id: bodyA.data.id }).first();
      const apptB = await db('appointments').where({ id: bodyB.data.id }).first();
      
      expect(apptA.clinic_id).toBe(clinicA.id);
      expect(apptB.clinic_id).toBe(clinicB.id);
      expect(apptA.chair_number).toBe(sharedChair);
      expect(apptB.chair_number).toBe(sharedChair);
    });
  });
});
