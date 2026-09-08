/**
 * TX-06: Clinic Isolation Tests for the Financial Report (and its cache)
 *
 * Specifically targets the cache-leak scenario: report_snapshots used to be
 * keyed only by (report_type, params) with no clinic scoping, so Clinic A's
 * cached financial report would be served to Clinic B on a cache hit even
 * after the underlying query was clinic-filtered.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../app.js';
import bcrypt from 'bcrypt';

describe('TX-06: Clinic Isolation - Financial Report', () => {
  let app;
  let db;

  let clinicA;
  let clinicB;
  let tokenA;
  let tokenB;

  beforeAll(async () => {
    app = await buildApp();
    db = app.db;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(async () => {
    await db('report_snapshots').where('report_type', 'FINANCIAL').del();
    await db('invoices').where('notes', 'LIKE', 'tx06-rep-%').del();
    await db('patients').where('first_name', 'LIKE', 'TX06Rep%').del();
    await db('users').where('email', 'LIKE', 'tx06-rep-%').del();
    await db('clinics').where('slug', 'LIKE', 'tx06-rep-%').del();

    const clinicsA = await db('clinics').insert({ name: 'TX06 Report Clinic A', slug: 'tx06-rep-a' }).returning('*');
    clinicA = clinicsA[0];
    const clinicsB = await db('clinics').insert({ name: 'TX06 Report Clinic B', slug: 'tx06-rep-b' }).returning('*');
    clinicB = clinicsB[0];

    const password_hash = await bcrypt.hash('password123', 12);

    await db('users').insert({
      username: 'tx06-rep-admin-a', email: 'tx06-rep-admin-a@test.local',
      password_hash, role: 'ADMIN', clinic_id: clinicA.id, is_active: true,
    });
    await db('users').insert({
      username: 'tx06-rep-admin-b', email: 'tx06-rep-admin-b@test.local',
      password_hash, role: 'ADMIN', clinic_id: clinicB.id, is_active: true,
    });

    tokenA = JSON.parse((await app.inject({
      method: 'POST', url: '/api/v1/auth/login',
      payload: { email: 'tx06-rep-admin-a@test.local', password: 'password123' },
    })).body).data.accessToken;

    tokenB = JSON.parse((await app.inject({
      method: 'POST', url: '/api/v1/auth/login',
      payload: { email: 'tx06-rep-admin-b@test.local', password: 'password123' },
    })).body).data.accessToken;

    const [patientA] = await db('patients').insert({
      clinic_id: clinicA.id, first_name: 'TX06RepPatientA', last_name: 'A',
      date_of_birth: '1990-01-01', gender: 'male', national_id: 'TX06REP-A-' + Date.now(), phone: '+1',
    }).returning('*');

    // A distinctive, easy-to-spot revenue figure for Clinic A only
    await db('invoices').insert({
      clinic_id: clinicA.id, patient_id: patientA.id,
      line_items: JSON.stringify([{ description: 'X', quantity: 1, unit_cost: 123456, total: 123456 }]),
      subtotal: 123456, tax_rate: 0, tax_amount: 0, total_amount: 123456, amount_paid: 123456,
      status: 'PAID', notes: 'tx06-rep-a-invoice',
    });
  });

  it('🔒 CACHE-LEAK TEST: Clinic B must NOT see Clinic A\'s financial totals, even on a repeat request with identical params', async () => {
    // 1) Clinic A requests the financial report first - this populates the cache.
    const resA = await app.inject({
      method: 'GET', url: '/api/v1/reports/financial',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(resA.statusCode).toBe(200);
    const bodyA = JSON.parse(resA.body);
    expect(Number(bodyA.data.totals.total_invoiced)).toBe(123456);

    // 2) Clinic B immediately requests the SAME report with the SAME (empty) params.
    //    Before the fix, this would hit Clinic A's cached row and return 123456 to Clinic B too.
    const resB = await app.inject({
      method: 'GET', url: '/api/v1/reports/financial',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect(resB.statusCode).toBe(200);
    const bodyB = JSON.parse(resB.body);
    expect(Number(bodyB.data.totals.total_invoiced)).not.toBe(123456);
    expect(Number(bodyB.data.totals.total_invoiced)).toBe(0);
  });

  it('should serve Clinic A its own cached report on a second request (cache still works)', async () => {
    const first = await app.inject({
      method: 'GET', url: '/api/v1/reports/financial',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const second = await app.inject({
      method: 'GET', url: '/api/v1/reports/financial',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(JSON.parse(first.body).data.totals.total_invoiced)
      .toBe(JSON.parse(second.body).data.totals.total_invoiced);

    const cachedRows = await db('report_snapshots').where({ report_type: 'FINANCIAL', clinic_id: clinicA.id });
    expect(cachedRows.length).toBeGreaterThanOrEqual(1);
  });
});
