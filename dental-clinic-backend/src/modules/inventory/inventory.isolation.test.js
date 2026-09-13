/**
 * TX-07: Clinic Isolation Tests for Inventory Module (JWT-Based)
 *
 * Creates real users in different clinics, uses real login tokens, and
 * proves inventory items are isolated per clinic - following the same
 * pattern verified in TX-01/02/03/04/06.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../app.js';
import bcrypt from 'bcrypt';

describe('TX-07: Clinic Isolation - Inventory Module (JWT-Based)', () => {
  let app;
  let db;

  let clinicA;
  let clinicB;
  let tokenA;
  let tokenB;
  let inventoryA;
  let inventoryB;

  beforeAll(async () => {
    app = await buildApp();
    db = app.db;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(async () => {
    // FK-aware cleanup order: inventory -> users -> clinics
    await db('inventory').where('material_name', 'LIKE', 'TX07Inv%').del();
    await db('users').where('email', 'LIKE', 'tx07-inv-%').del();
    await db('clinics').where('slug', 'LIKE', 'tx07-inv-%').del();

    const clinicsA = await db('clinics').insert({ name: 'TX07 Inventory Clinic A', slug: 'tx07-inv-a' }).returning('*');
    clinicA = clinicsA[0];
    const clinicsB = await db('clinics').insert({ name: 'TX07 Inventory Clinic B', slug: 'tx07-inv-b' }).returning('*');
    clinicB = clinicsB[0];

    const password_hash = await bcrypt.hash('password123', 12);

    await db('users').insert({
      username: 'tx07-inv-admin-a', email: 'tx07-inv-admin-a@test.local',
      password_hash, role: 'ADMIN', clinic_id: clinicA.id, is_active: true,
    });
    await db('users').insert({
      username: 'tx07-inv-admin-b', email: 'tx07-inv-admin-b@test.local',
      password_hash, role: 'ADMIN', clinic_id: clinicB.id, is_active: true,
    });

    const loginA = await app.inject({
      method: 'POST', url: '/api/v1/auth/login',
      payload: { email: 'tx07-inv-admin-a@test.local', password: 'password123' },
    });
    tokenA = JSON.parse(loginA.body).data.accessToken;

    const loginB = await app.inject({
      method: 'POST', url: '/api/v1/auth/login',
      payload: { email: 'tx07-inv-admin-b@test.local', password: 'password123' },
    });
    tokenB = JSON.parse(loginB.body).data.accessToken;

    const itemsA = await db('inventory').insert({
      clinic_id: clinicA.id,
      material_name: 'TX07InvItemA',
      category: 'Consumables',
      quantity: 100,
      unit: 'piece',
      min_stock_alert: 10,
      unit_price: 5.50,
      supplier_info: 'Supplier A',
    }).returning('*');
    inventoryA = itemsA[0];

    const itemsB = await db('inventory').insert({
      clinic_id: clinicB.id,
      material_name: 'TX07InvItemB',
      category: 'Medications',
      quantity: 50,
      unit: 'box',
      min_stock_alert: 5,
      unit_price: 25.00,
      supplier_info: 'Supplier B',
    }).returning('*');
    inventoryB = itemsB[0];
  });

  describe('GET /api/v1/inventory (List)', () => {
    it('should return ONLY Clinic A inventory items when authenticated as Clinic A user', async () => {
      const res = await app.inject({
        method: 'GET', url: '/api/v1/inventory',
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      const ids = body.data.map((i) => i.id);
      expect(ids).toContain(inventoryA.id);
      expect(ids).not.toContain(inventoryB.id);
    });

    it('should return ONLY Clinic B inventory items when authenticated as Clinic B user', async () => {
      const res = await app.inject({
        method: 'GET', url: '/api/v1/inventory',
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      const ids = body.data.map((i) => i.id);
      expect(ids).toContain(inventoryB.id);
      expect(ids).not.toContain(inventoryA.id);
    });
  });

  describe('GET /api/v1/inventory/:id (Get Single)', () => {
    it('should return inventory item when requesting from SAME clinic', async () => {
      const res = await app.inject({
        method: 'GET', url: `/api/v1/inventory/${inventoryA.id}`,
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).data.id).toBe(inventoryA.id);
    });

    it('🔒 ISOLATION TEST: should return 404 when requesting from DIFFERENT clinic', async () => {
      const res = await app.inject({
        method: 'GET', url: `/api/v1/inventory/${inventoryA.id}`,
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /api/v1/inventory (Create)', () => {
    it('should create inventory item in the correct clinic', async () => {
      const res = await app.inject({
        method: 'POST', url: '/api/v1/inventory',
        headers: { Authorization: `Bearer ${tokenA}` },
        payload: {
          material_name: 'TX07InvNewItem',
          category: 'Instruments',
          quantity: 20,
          unit: 'piece',
          min_stock_alert: 5,
          unit_price: 15.00,
        },
      });
      expect(res.statusCode).toBe(201);
      const created = JSON.parse(res.body).data;
      expect(created.clinic_id).toBe(clinicA.id);
    });
  });

  describe('PUT /api/v1/inventory/:id (Update)', () => {
    it('should update inventory item when requesting from SAME clinic', async () => {
      const res = await app.inject({
        method: 'PUT', url: `/api/v1/inventory/${inventoryA.id}`,
        headers: { Authorization: `Bearer ${tokenA}` },
        payload: { quantity: 150 },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).data.quantity).toBe(150);
    });

    it('🔒 ISOLATION TEST: should return 404 when updating from DIFFERENT clinic', async () => {
      const res = await app.inject({
        method: 'PUT', url: `/api/v1/inventory/${inventoryA.id}`,
        headers: { Authorization: `Bearer ${tokenB}` },
        payload: { quantity: 999 },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/v1/inventory/:id (Delete)', () => {
    it('should delete inventory item when requesting from SAME clinic', async () => {
      const res = await app.inject({
        method: 'DELETE', url: `/api/v1/inventory/${inventoryA.id}`,
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      expect(res.statusCode).toBe(200);
    });

    it('🔒 ISOLATION TEST: should return 404 when deleting from DIFFERENT clinic', async () => {
      const res = await app.inject({
        method: 'DELETE', url: `/api/v1/inventory/${inventoryB.id}`,
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/inventory/alerts (Low Stock & Near Expiry)', () => {
    beforeEach(async () => {
      // Create low-stock item in Clinic A
      await db('inventory').insert({
        clinic_id: clinicA.id,
        material_name: 'TX07InvLowStockA',
        category: 'Consumables',
        quantity: 2,
        unit: 'piece',
        min_stock_alert: 10,
        unit_price: 1.00,
      });

      // Create low-stock item in Clinic B too
      await db('inventory').insert({
        clinic_id: clinicB.id,
        material_name: 'TX07InvLowStockB',
        category: 'Medications',
        quantity: 3,
        unit: 'box',
        min_stock_alert: 10,
        unit_price: 10.00,
      });
    });

    it('should return ONLY Clinic A low-stock items', async () => {
      const res = await app.inject({
        method: 'GET', url: '/api/v1/inventory/alerts',
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      const lowStockNames = body.data.low_stock.map((i) => i.material_name);
      expect(lowStockNames).toContain('TX07InvLowStockA');
      expect(lowStockNames).not.toContain('TX07InvLowStockB');
    });

    it('should return ONLY Clinic B low-stock items', async () => {
      const res = await app.inject({
        method: 'GET', url: '/api/v1/inventory/alerts',
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      const lowStockNames = body.data.low_stock.map((i) => i.material_name);
      expect(lowStockNames).toContain('TX07InvLowStockB');
      expect(lowStockNames).not.toContain('TX07InvLowStockA');
    });
  });

  describe('GET /api/v1/reports/inventory - inventorySummary() isolation', () => {
    it('🔒 INVENTORY SUMMARY LEAK TEST: Clinic B should NOT see Clinic A stock value', async () => {
      // Clinic A has inventory worth: 100 * $5.50 = $550
      const resA = await app.inject({
        method: 'GET', url: '/api/v1/reports/inventory',
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      expect(resA.statusCode).toBe(200);
      const bodyA = JSON.parse(resA.body);
      expect(Number(bodyA.data.summary.total_stock_value)).toBe(550);

      // Clinic B has inventory worth: 50 * $25.00 = $1250
      const resB = await app.inject({
        method: 'GET', url: '/api/v1/reports/inventory',
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      expect(resB.statusCode).toBe(200);
      const bodyB = JSON.parse(resB.body);
      expect(Number(bodyB.data.summary.total_stock_value)).toBe(1250);
      
      // Confirm Clinic B does NOT see Clinic A's $550
      expect(Number(bodyB.data.summary.total_stock_value)).not.toBe(550);
    });
  });
});
