/**
 * TX-06: Clinic Isolation Tests for Invoices Module (JWT-Based)
 *
 * Creates real users in different clinics, uses real login tokens, and
 * proves invoices/payments/refunds are isolated per clinic - following the
 * same pattern verified in TX-01/02/03/04.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../app.js';
import bcrypt from 'bcrypt';

describe('TX-06: Clinic Isolation - Invoices Module (JWT-Based)', () => {
  let app;
  let db;

  let clinicA;
  let clinicB;
  let tokenA;
  let tokenB;
  let patientA;
  let patientB;
  let invoiceA;
  let invoiceB;

  beforeAll(async () => {
    app = await buildApp();
    db = app.db;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(async () => {
    // FK-aware cleanup order: payment_refunds -> payments -> invoices -> appointments -> patients -> users -> clinics
    await db('payment_refunds').whereIn('invoice_id', db('invoices').select('id').where('notes', 'LIKE', 'tx06-inv-%')).del();
    await db('payments').whereIn('invoice_id', db('invoices').select('id').where('notes', 'LIKE', 'tx06-inv-%')).del();
    await db('invoices').where('notes', 'LIKE', 'tx06-inv-%').del();
    await db('patients').where('first_name', 'LIKE', 'TX06Inv%').del();
    await db('users').where('email', 'LIKE', 'tx06-inv-%').del();
    await db('clinics').where('slug', 'LIKE', 'tx06-inv-%').del();

    const clinicsA = await db('clinics').insert({ name: 'TX06 Invoices Clinic A', slug: 'tx06-inv-a' }).returning('*');
    clinicA = clinicsA[0];
    const clinicsB = await db('clinics').insert({ name: 'TX06 Invoices Clinic B', slug: 'tx06-inv-b' }).returning('*');
    clinicB = clinicsB[0];

    const password_hash = await bcrypt.hash('password123', 12);

    await db('users').insert({
      username: 'tx06-inv-admin-a', email: 'tx06-inv-admin-a@test.local',
      password_hash, role: 'ADMIN', clinic_id: clinicA.id, is_active: true,
    });
    await db('users').insert({
      username: 'tx06-inv-admin-b', email: 'tx06-inv-admin-b@test.local',
      password_hash, role: 'ADMIN', clinic_id: clinicB.id, is_active: true,
    });

    const loginA = await app.inject({
      method: 'POST', url: '/api/v1/auth/login',
      payload: { email: 'tx06-inv-admin-a@test.local', password: 'password123' },
    });
    tokenA = JSON.parse(loginA.body).data.accessToken;

    const loginB = await app.inject({
      method: 'POST', url: '/api/v1/auth/login',
      payload: { email: 'tx06-inv-admin-b@test.local', password: 'password123' },
    });
    tokenB = JSON.parse(loginB.body).data.accessToken;

    const patientsA = await db('patients').insert({
      clinic_id: clinicA.id, first_name: 'TX06InvPatientA', last_name: 'A',
      date_of_birth: '1990-01-01', gender: 'male', national_id: 'TX06INV-A-' + Date.now(), phone: '+1',
    }).returning('*');
    patientA = patientsA[0];

    const patientsB = await db('patients').insert({
      clinic_id: clinicB.id, first_name: 'TX06InvPatientB', last_name: 'B',
      date_of_birth: '1990-01-01', gender: 'female', national_id: 'TX06INV-B-' + Date.now(), phone: '+2',
    }).returning('*');
    patientB = patientsB[0];

    const invoicesA = await db('invoices').insert({
      clinic_id: clinicA.id, patient_id: patientA.id,
      line_items: JSON.stringify([{ description: 'Cleaning', quantity: 1, unit_cost: 100, total: 100 }]),
      subtotal: 100, tax_rate: 0, tax_amount: 0, total_amount: 100, amount_paid: 0,
      status: 'ISSUED', notes: 'tx06-inv-a-invoice',
    }).returning('*');
    invoiceA = invoicesA[0];

    const invoicesB = await db('invoices').insert({
      clinic_id: clinicB.id, patient_id: patientB.id,
      line_items: JSON.stringify([{ description: 'Filling', quantity: 1, unit_cost: 200, total: 200 }]),
      subtotal: 200, tax_rate: 0, tax_amount: 0, total_amount: 200, amount_paid: 0,
      status: 'ISSUED', notes: 'tx06-inv-b-invoice',
    }).returning('*');
    invoiceB = invoicesB[0];
  });

  describe('GET /api/v1/invoices (List)', () => {
    it('should return ONLY Clinic A invoices when authenticated as Clinic A user', async () => {
      const res = await app.inject({
        method: 'GET', url: '/api/v1/invoices',
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      const ids = body.data.map((i) => i.id);
      expect(ids).toContain(invoiceA.id);
      expect(ids).not.toContain(invoiceB.id);
    });
  });

  describe('GET /api/v1/invoices/:id (Get Single)', () => {
    it('🔒 ISOLATION TEST: should return 404 when requesting an invoice from a DIFFERENT clinic', async () => {
      const res = await app.inject({
        method: 'GET', url: `/api/v1/invoices/${invoiceA.id}`,
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      expect(res.statusCode).toBe(404);
    });

    it('should return the invoice when requesting from the SAME clinic', async () => {
      const res = await app.inject({
        method: 'GET', url: `/api/v1/invoices/${invoiceA.id}`,
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).data.id).toBe(invoiceA.id);
    });
  });

  describe('POST /api/v1/invoices (Create) - cross-clinic reference attack', () => {
    it('🔒 ISOLATION TEST: should reject creating an invoice for a patient from a DIFFERENT clinic', async () => {
      const res = await app.inject({
        method: 'POST', url: '/api/v1/invoices',
        headers: { Authorization: `Bearer ${tokenA}` },
        payload: {
          patient_id: patientB.id, // Clinic B's patient!
          line_items: [{ description: 'Attack', quantity: 1, unit_cost: 50, total: 50 }],
        },
      });
      expect(res.statusCode).toBe(404);
    });

    it('should create an invoice for a patient in the SAME clinic', async () => {
      const res = await app.inject({
        method: 'POST', url: '/api/v1/invoices',
        headers: { Authorization: `Bearer ${tokenA}` },
        payload: {
          patient_id: patientA.id,
          notes: 'tx06-inv-created',
          line_items: [{ description: 'X-ray', quantity: 1, unit_cost: 75, total: 75 }],
        },
      });
      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res.body).data.clinic_id).toBe(clinicA.id);
    });
  });

  describe('POST /api/v1/invoices/:id/payments (Record Payment)', () => {
    it('🔒 ISOLATION TEST: should return 404 when recording a payment on ANOTHER clinic\'s invoice', async () => {
      const res = await app.inject({
        method: 'POST', url: `/api/v1/invoices/${invoiceA.id}/payments`,
        headers: { Authorization: `Bearer ${tokenB}` },
        payload: { amount: 10, method: 'CASH' },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/dashboard/stats - pendingPayments isolation', () => {
    it('should not include another clinic\'s overdue invoices in pendingPayments total', async () => {
      // Make Clinic B's invoice overdue with a due_date in the past
      await db('invoices').where({ id: invoiceB.id }).update({ status: 'OVERDUE', due_date: '2020-01-01' });

      const res = await app.inject({
        method: 'GET', url: '/api/v1/dashboard/stats',
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      // Clinic A has no overdue invoices of its own in this test - Clinic B's must not leak in
      expect(body.data.pendingPayments.overdueCount).toBe(0);
    });
  });
});
