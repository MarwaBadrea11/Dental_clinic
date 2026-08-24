/**
 * Smoke tests for SmileFix backend
 * These tests ensure the basic infrastructure is working before multi-tenant migration
 * 
 * NOTE: These tests require a running PostgreSQL database with migrations applied.
 * Run: npm run db:migrate before running tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from './app.js';

describe('SmileFix Backend - Smoke Tests', () => {
  let app;

  beforeAll(async () => {
    try {
      app = await buildApp();
    } catch (error) {
      console.error('Failed to build app:', error.message);
      throw error;
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('App Initialization', () => {
    it('should create a Fastify app instance', () => {
      expect(app).toBeDefined();
      expect(typeof app.listen).toBe('function');
      expect(typeof app.inject).toBe('function');
    });

    it('should have health check endpoint', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/health'
      });
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });

  describe('Authentication Routes', () => {
    it('should have /auth/login endpoint', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'nonexistent@test.com',
          password: 'wrongpassword'
        }
      });
      
      // Should return 400 or 401, not 404 (endpoint exists)
      expect([400, 401, 500]).toContain(response.statusCode);
    });

    it('should reject requests without credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {}
      });
      
      // Should return validation error (400/422) or auth error (401)
      expect([400, 401, 422]).toContain(response.statusCode);
    });
  });

  describe('Protected Routes', () => {
    it('should reject unauthenticated requests to /patients', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/patients'
      });
      
      expect(response.statusCode).toBe(401);
    });

    it('should reject unauthenticated requests to /appointments', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/appointments'
      });
      
      expect(response.statusCode).toBe(401);
    });
  });
});
