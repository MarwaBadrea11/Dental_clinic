/**
 * TX-04 Isolation Tests: Treatments Module (treatment_plans & treatment_procedures)
 * Tests clinic isolation + cross-clinic reference attack prevention
 * Pattern: Exact copy of appointments.isolation.test.js structure
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../app.js';
import bcrypt from 'bcrypt';

describe('TX-04: Treatments Module - Clinic Isolation', () => {
  let app;
  let db;
  
  let clinicA;
  let clinicB;
  let dentistA;
  let dentistB;
  let tokenA;
  let tokenB;
  let patientA;
  let patientB;
  let procedureA;
  let procedureB;
  let planA;
  let planB;

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
    // Clean up ALL this test file's data (including test-created rows)
    // FK order: treatment_procedures → treatment_plans → procedure_catalog, patients → users → clinics
    await db('treatment_procedures').whereIn('treatment_plan_id',
      db('treatment_plans').where('title', 'LIKE', 'TX04TREAT%').select('id')
    ).del();
    await db('treatment_plans').where('title', 'LIKE', 'TX04TREAT%').del();
    await db('procedure_catalog').where('code', 'LIKE', 'TX04TREAT%').del();
    await db('patients').where('first_name', 'LIKE', 'TX04TreatPatient%').del();
    await db('users').where('email', 'LIKE', 'tx04-treat-%').del();
    await db('clinics').where('slug', 'LIKE', 'tx04-treat-%').del();

    // Create two test clinics
    const clinicsA = await db('clinics')
      .insert({
        name: 'TX04 Treatments Clinic A',
        slug: 'tx04-treat-clinic-a',
      })
      .returning('*');
    clinicA = clinicsA[0];

    const clinicsB = await db('clinics')
      .insert({
        name: 'TX04 Treatments Clinic B',
        slug: 'tx04-treat-clinic-b',
      })
      .returning('*');
    clinicB = clinicsB[0];

    const password_hash = await bcrypt.hash('password123', 12);

    // Create DENTIST users (have treatments:* permission)
    const dentistsA = await db('users')
      .insert({
        username: 'tx04-treat-dentist-a',
        email: 'tx04-treat-dentist-a@test.local',
        password_hash,
        role: 'DENTIST',
        clinic_id: clinicA.id,
        is_active: true,
      })
      .returning('*');
    dentistA = dentistsA[0];

    const dentistsB = await db('users')
      .insert({
        username: 'tx04-treat-dentist-b',
        email: 'tx04-treat-dentist-b@test.local',
        password_hash,
        role: 'DENTIST',
        clinic_id: clinicB.id,
        is_active: true,
      })
      .returning('*');
    dentistB = dentistsB[0];

    // Login to get tokens
    const loginA = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: dentistA.email,
        password: 'password123',
      },
    });
    const loginABody = JSON.parse(loginA.body);
    if (!loginABody.success || !loginABody.data) {
      throw new Error(`Login failed for Clinic A: ${JSON.stringify(loginABody)}`);
    }
    tokenA = loginABody.data.accessToken;

    const loginB = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: dentistB.email,
        password: 'password123',
      },
    });
    const loginBBody = JSON.parse(loginB.body);
    if (!loginBBody.success || !loginBBody.data) {
      throw new Error(`Login failed for Clinic B: ${JSON.stringify(loginBBody)}`);
    }
    tokenB = loginBBody.data.accessToken;

    // Create patients for each clinic
    const patientsA = await db('patients')
      .insert({
        first_name: 'TX04TreatPatientA',
        last_name: 'Test',
        date_of_birth: '1990-01-01',
        gender: 'M',
        national_id: 'TX04-A-123',
        phone: '555-1001',
        email: 'tx04-treat-patient-a@test.local',
        clinic_id: clinicA.id,
      })
      .returning('*');
    patientA = patientsA[0];

    const patientsB = await db('patients')
      .insert({
        first_name: 'TX04TreatPatientB',
        last_name: 'Test',
        date_of_birth: '1990-01-02',
        gender: 'F',
        national_id: 'TX04-B-456',
        phone: '555-1002',
        email: 'tx04-treat-patient-b@test.local',
        clinic_id: clinicB.id,
      })
      .returning('*');
    patientB = patientsB[0];

    // Create procedures for each clinic
    const proceduresA = await db('procedure_catalog')
      .insert({
        code: 'TX04TREAT_PROC_A',
        name: 'Clinic A Procedure',
        default_cost: 100,
        category: 'Preventive',
        clinic_id: clinicA.id,
      })
      .returning('*');
    procedureA = proceduresA[0];

    const proceduresB = await db('procedure_catalog')
      .insert({
        code: 'TX04TREAT_PROC_B',
        name: 'Clinic B Procedure',
        default_cost: 200,
        category: 'Restorative',
        clinic_id: clinicB.id,
      })
      .returning('*');
    procedureB = proceduresB[0];

    // Create treatment plans
    const plansA = await db('treatment_plans')
      .insert({
        patient_id: patientA.id,
        dentist_id: dentistA.id,
        title: 'TX04TREAT_Plan_A',
        status: 'DRAFT',
        clinic_id: clinicA.id,
      })
      .returning('*');
    planA = plansA[0];

    const plansB = await db('treatment_plans')
      .insert({
        patient_id: patientB.id,
        dentist_id: dentistB.id,
        title: 'TX04TREAT_Plan_B',
        status: 'DRAFT',
        clinic_id: clinicB.id,
      })
      .returning('*');
    planB = plansB[0];
  });

  describe('GET /api/v1/treatments - List treatment plans', () => {
    it('should return only own clinic plans', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/treatments',
        headers: { authorization: `Bearer ${tokenA}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);

      const ids = body.data.map(p => p.id);
      expect(ids).toContain(planA.id);
      expect(ids).not.toContain(planB.id);
    });

    it('should not leak plans from other clinics', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/treatments',
        headers: { authorization: `Bearer ${tokenB}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);

      const ids = body.data.map(p => p.id);
      expect(ids).toContain(planB.id);
      expect(ids).not.toContain(planA.id);
    });
  });

  describe('GET /api/v1/treatments/:id - Get treatment plan', () => {
    it('should return plan from own clinic', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/treatments/${planA.id}`,
        headers: { authorization: `Bearer ${tokenA}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(planA.id);
    });

    it('should return 404 when accessing other clinic plan', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/treatments/${planB.id}`,
        headers: { authorization: `Bearer ${tokenA}` },
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });
  });

  describe('POST /api/v1/treatments - Create treatment plan', () => {
    it('should create plan with own clinic_id', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/treatments',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          patient_id: patientA.id,
          dentist_id: dentistA.id,
          title: 'TX04TREAT_New_A',
          procedures: [
            {
              procedure_id: procedureA.id,
              unit_cost: 100,
              quantity: 1,
            },
          ],
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.clinic_id).toBe(clinicA.id);

      const procedures = await db('treatment_procedures')
        .where({ treatment_plan_id: body.data.id });
      expect(procedures).toHaveLength(1);
      expect(procedures[0].clinic_id).toBe(clinicA.id);
    });

    it('should reject cross-clinic patient reference attack', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/treatments',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          patient_id: patientB.id,
          dentist_id: dentistA.id,
          title: 'TX04TREAT_Attack1',
          procedures: [],
        },
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Patient');
    });

    it('should reject cross-clinic dentist reference attack', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/treatments',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          patient_id: patientA.id,
          dentist_id: dentistB.id,
          title: 'TX04TREAT_Attack2',
          procedures: [],
        },
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Dentist');
    });

    it('should reject cross-clinic procedure reference attack', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/treatments',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          patient_id: patientA.id,
          dentist_id: dentistA.id,
          title: 'TX04TREAT_Attack3',
          procedures: [
            {
              procedure_id: procedureB.id,
              unit_cost: 100,
              quantity: 1,
            },
          ],
        },
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('procedures');
    });
  });

  describe('PATCH /api/v1/treatments/:id - Update treatment plan', () => {
    it('should update own clinic plan', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/treatments/${planA.id}`,
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          title: 'TX04TREAT_Updated_A',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.title).toContain('Updated');
    });

    it('should return 404 when updating other clinic plan', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/treatments/${planB.id}`,
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          title: 'Hacked',
        },
      });

      expect(res.statusCode).toBe(404);

      const dbPlan = await db('treatment_plans').where({ id: planB.id }).first();
      expect(dbPlan.title).toContain('Plan_B');
    });
  });
});
