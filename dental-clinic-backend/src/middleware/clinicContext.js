/**
 * Clinic Context Middleware (TX-01: Multi-Tenancy Pilot)
 * 
 * Attaches clinic_id to every request for data isolation.
 * 
 * TX-01 PILOT: Reads clinic from X-Clinic-ID header (temporary mechanism)
 * - Allows testing isolation between multiple clinics
 * - Falls back to main clinic if header not provided
 * - Validates that clinic exists in database
 * 
 * TX-02 ROLLOUT: Will replace this with proper resolution:
 *   - Subdomain extraction (clinic1.smilefix.com)
 *   - User's associated clinic
 *   - API key-based clinic association
 * 
 * CRITICAL: All database queries MUST use request.clinicId to filter data.
 * This prevents cross-clinic data leaks.
 */

import { AppError } from '../utils/errors.js';

/**
 * Attaches clinic context to the request
 * 
 * Resolution order:
 * 1. X-Clinic-ID header (if provided and valid)
 * 2. Main clinic (fallback)
 * 
 * @param {import('fastify').FastifyRequest} request
 * @param {import('fastify').FastifyReply} reply
 */
export async function attachClinicContext(request, reply) {
  try {
    let clinicId = null;
    
    // Step 1: Try to get clinic from X-Clinic-ID header
    const headerClinicId = request.headers['x-clinic-id'];
    
    if (headerClinicId) {
      // Validate that this clinic exists
      const clinic = await request.server.db('clinics')
        .where({ id: headerClinicId })
        .first('id');
      
      if (!clinic) {
        // Header provided but clinic doesn't exist - reject request
        throw new AppError(`Invalid clinic ID: ${headerClinicId}`, 400);
      }
      
      clinicId = clinic.id;
      request.log.info({ clinicId }, 'Clinic context from X-Clinic-ID header');
    }
    
    // Step 2: Fallback to main clinic if no header
    if (!clinicId) {
      clinicId = await getMainClinicId(request);
      request.log.info({ clinicId }, 'Clinic context from main clinic (fallback)');
    }
    
    if (!clinicId) {
      throw new AppError('No clinic context available', 500);
    }
    
    // Attach to request object for use in repositories/services
    request.clinicId = clinicId;
    
    // Also attach to reply locals for logging/debugging
    reply.locals = reply.locals || {};
    reply.locals.clinicId = clinicId;
    
  } catch (err) {
    if (err instanceof AppError) {
      throw err; // Re-throw our errors as-is
    }
    request.log.error({ err }, 'Failed to attach clinic context');
    throw new AppError('Clinic context error', 500);
  }
}

/**
 * Get the main clinic ID from database
 * Cached for performance (in production, use Redis or similar)
 * 
 * @param {import('fastify').FastifyRequest} request
 * @returns {Promise<string>} Clinic UUID
 */
let mainClinicIdCache = null;

async function getMainClinicId(request) {
  if (mainClinicIdCache) {
    return mainClinicIdCache;
  }
  
  // Query database for main clinic
  const mainClinic = await request.server.db('clinics')
    .where({ slug: 'smilefix-main-clinic' })
    .first('id');
  
  if (!mainClinic) {
    throw new AppError('Main clinic not found - run migrations', 500);
  }
  
  mainClinicIdCache = mainClinic.id;
  return mainClinicIdCache;
}

/**
 * Enforces clinic isolation on patient queries
 * MUST be used after attachClinicContext
 * 
 * @param {import('fastify').FastifyRequest} request
 * @param {import('fastify').FastifyReply} reply
 */
export async function enforceClinicIsolation(request, reply) {
  if (!request.clinicId) {
    request.log.error('Clinic isolation enforced but no clinicId on request');
    throw new AppError('Clinic context missing', 500);
  }
  
  // Clinic context is present, let the request continue
  // The repository layer MUST use request.clinicId in WHERE clauses
}

/**
 * Helper: Add clinic filter to Knex query
 * Use this in all repository queries to enforce isolation
 * 
 * @example
 * const patients = await addClinicFilter(
 *   request.server.knex('patients'),
 *   request.clinicId
 * ).where({ id: patientId });
 * 
 * @param {import('knex').Knex.QueryBuilder} query
 * @param {string} clinicId
 * @returns {import('knex').Knex.QueryBuilder}
 */
export function addClinicFilter(query, clinicId) {
  return query.where({ clinic_id: clinicId });
}

/**
 * Clear clinic ID cache (for testing)
 * Call this between tests to ensure clean state
 * 
 * @internal
 */
export function clearClinicCache() {
  mainClinicIdCache = null;
}
