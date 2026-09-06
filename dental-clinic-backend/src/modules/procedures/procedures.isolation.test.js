/**
 * TX-04 Isolation Tests: Procedures Module (procedure_catalog)
 * Tests clinic isolation for procedure catalog operations
 * Pattern: Exact copy of appointments.isolation.test.js structure
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../app.js';
import bcrypt from 'bcrypt';

describe('TX-04: Procedures Module - Clinic Isolation', () => {
  let app;
  let db;
  
  let clinicA;
  let clinicB;
  let userA;
  let userB;
  let tokenA;
  let tokenB;
  let procedureA;
  let procedureB;

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
    // FK order: procedure_catalog references clinics, so delete procedures first
    await db('procedure_catalog').where('code', 'LIKE', 'TX04PROC%').del();
    await db('users').where('email', 'LIKE', 'tx04-proc-%').del();
    await db('clinics').where('slug', 'LIKE', 'tx04-proc-%').del();

    // Create two test clinics
    const clinicsA = await db('clinics')
      .insert({
        name: 'TX04 Procedures Clinic A',
        slug: 'tx04-proc-clinic-a',
      })
      .returning('*');
    clinicA = clinicsA[0];

    const clinicsB = await db('clinics')
      .insert({
        name: 'TX04 Procedures Clinic B',
        slug: 'tx04-proc-clinic-b',
      })
      .returning('*');
    clinicB = clinicsB[0];

    const password_hash = await bcrypt.hash('password123', 12);

    // Create RECEPTIONIST users (have invoices:* permission - semantically correct for procedure catalog)
    const usersA = await db('users')
      .insert({
        username: 'tx04-proc-receptionist-a',
        email: 'tx04-proc-receptionist-a@test.local',
        password_hash,
        role: 'RECEPTIONIST',
        clinic_id: clinicA.id,
        is_active: true,
      })
      .returning('*');
    userA = usersA[0];

    const usersB = await db('users')
      .insert({
        username: 'tx04-proc-receptionist-b',
        email: 'tx04-proc-receptionist-b@test.local',
        password_hash,
        role: 'RECEPTIONIST',
        clinic_id: clinicB.id,
        is_active: true,
      })
      .returning('*');
    userB = usersB[0];

    // Login to get tokens
    const loginA = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: userA.email,
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
        email: userB.email,
        password: 'password123',
      },
    });
    const loginBBody = JSON.parse(loginB.body);
    if (!loginBBody.success || !loginBBody.data) {
      throw new Error(`Login failed for Clinic B: ${JSON.stringify(loginBBody)}`);
    }
    tokenB = loginBBody.data.accessToken;

    // Create procedures for each clinic
    const proceduresA = await db('procedure_catalog')
      .insert({
        code: 'TX04PROC_A',
        name: 'Clinic A Procedure',
        default_cost: 100,
        category: 'Preventive',
        clinic_id: clinicA.id,
      })
      .returning('*');
    procedureA = proceduresA[0];

    const proceduresB = await db('procedure_catalog')
      .insert({
        code: 'TX04PROC_B',
        name: 'Clinic B Procedure',
        default_cost: 200,
        category: 'Restorative',
        clinic_id: clinicB.id,
      })
      .returning('*');
    procedureB = proceduresB[0];
  });

  describe('GET /api/v1/procedures - List procedures', () => {
    it('should return only own clinic procedures', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/procedures',
        headers: { authorization: `Bearer ${tokenA}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);

      const ids = body.data.map(p => p.id);
      expect(ids).toContain(procedureA.id);
      expect(ids).not.toContain(procedureB.id);
    });

    it('should not leak procedures from other clinics', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/procedures',
        headers: { authorization: `Bearer ${tokenB}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);

      const ids = body.data.map(p => p.id);
      expect(ids).toContain(procedureB.id);
      expect(ids).not.toContain(procedureA.id);
    });
  });

  describe('GET /api/v1/procedures/:id - Get procedure by ID', () => {
    it('should return procedure from own clinic', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/procedures/${procedureA.id}`,
        headers: { authorization: `Bearer ${tokenA}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(procedureA.id);
    });

    it('should return 404 when accessing other clinic procedure', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/procedures/${procedureB.id}`,
        headers: { authorization: `Bearer ${tokenA}` },
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });
  });

  describe('POST /api/v1/procedures - Create procedure', () => {
    it('should create procedure with own clinic_id', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/procedures',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          code: 'TX04PROC_NEW_A',
          name: 'New Clinic A Procedure',
          default_cost: 150,
          category: 'Preventive',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.clinic_id).toBe(clinicA.id);
    });

    it('should allow duplicate code across clinics', async () => {
      const code = 'TX04PROC_DUPE';

      const resA = await app.inject({
        method: 'POST',
        url: '/api/v1/procedures',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          code,
          name: 'Clinic A Duplicate',
          default_cost: 100,
          category: 'Restorative',
        },
      });

      expect(resA.statusCode).toBe(201);

      const resB = await app.inject({
        method: 'POST',
        url: '/api/v1/procedures',
        headers: { authorization: `Bearer ${tokenB}` },
        payload: {
          code,
          name: 'Clinic B Duplicate',
          default_cost: 200,
          category: 'Restorative',
        },
      });

      expect(resB.statusCode).toBe(201);

      const procs = await db('procedure_catalog').where({ code });
      expect(procs).toHaveLength(2);
      expect(procs.map(p => p.clinic_id).sort()).toEqual([clinicA.id, clinicB.id].sort());
    });
  });

  describe('PATCH /api/v1/procedures/:id - Update procedure', () => {
    it('should update own clinic procedure', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/procedures/${procedureA.id}`,
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          default_cost: 125,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Number(body.data.default_cost)).toBe(125);
    });

    it('should return 404 when updating other clinic procedure', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/procedures/${procedureB.id}`,
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          default_cost: 999,
        },
      });

      expect(res.statusCode).toBe(404);

      const dbProc = await db('procedure_catalog').where({ id: procedureB.id }).first();
      expect(Number(dbProc.default_cost)).toBe(200);
    });
  });

  describe('DELETE /api/v1/procedures/:id - Delete procedure', () => {
    it('should delete own clinic procedure', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/procedures/${procedureA.id}`,
        headers: { authorization: `Bearer ${tokenA}` },
      });

      expect(res.statusCode).toBe(200);

      const dbProc = await db('procedure_catalog').where({ id: procedureA.id }).first();
      expect(dbProc).toBeUndefined();
    });

    it('should return 404 when deleting other clinic procedure', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/procedures/${procedureB.id}`,
        headers: { authorization: `Bearer ${tokenA}` },
      });

      expect(res.statusCode).toBe(404);

      const dbProc = await db('procedure_catalog').where({ id: procedureB.id }).first();
      expect(dbProc).toBeDefined();
    });
  });
});
