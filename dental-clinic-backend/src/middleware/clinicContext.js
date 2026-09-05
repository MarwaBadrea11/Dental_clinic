/**
 * Clinic Context Middleware (TX-02: Multi-Tenancy - JWT-Based)
 * 
 * Attaches clinic_id to every request for data isolation.
 * 
 * TX-02: Reads clinic from authenticated user's JWT (request.user.clinic_id)
 * - JWT issued at login/refresh contains user's clinic_id
 * - All database queries MUST use request.clinicId to filter data
 * - This prevents cross-clinic data leaks
 * 
 * CRITICAL: All database queries MUST use request.clinicId to filter data.
 * This prevents cross-clinic data leaks.
 * 
 * KNOWN LIMITATION: ADMIN users are currently scoped to a single clinic.
 * Multi-clinic ADMIN access is documented in TX-02_PROGRESS.md for future
 * implementation (post-TX-02 rollout).
 */

import { AppError } from '../utils/errors.js';

/**
 * Attaches clinic context to the request
 * 
 * TX-02: Reads clinic_id from JWT payload (set during authentication)
 * Old tokens without clinic_id are rejected (force re-login)
 * 
 * @param {import('fastify').FastifyRequest} request
 * @param {import('fastify').FastifyReply} reply
 */
export async function attachClinicContext(request, reply) {
  try {
    // TX-02: Get clinic_id from authenticated user's JWT
    const clinicId = request.user?.clinic_id;
    
    if (!clinicId) {
      // Old token issued before TX-02 (missing clinic_id) or unauthenticated request
      throw new AppError(
        'Your session is outdated. Please log in again.',
        401  // Authentication error, not server error
      );
    }
    
    // Validate that this clinic still exists
    const clinic = await request.server.db('clinics')
      .where({ id: clinicId })
      .first('id', 'name');
    
    if (!clinic) {
      // User's clinic was deleted (should never happen due to FK RESTRICT)
      throw new AppError(
        'Your clinic assignment is invalid. Contact administrator.',
        403
      );
    }
    
    // Attach to request object for use in repositories/services
    request.clinicId = clinicId;
    
    // Also attach to reply locals for logging/debugging
    reply.locals = reply.locals || {};
    reply.locals.clinicId = clinicId;
    reply.locals.clinicName = clinic.name;
    
    request.log.info({ clinicId, clinicName: clinic.name }, 'Clinic context attached from JWT');
    
  } catch (err) {
    if (err instanceof AppError) {
      throw err; // Re-throw our errors as-is
    }
    request.log.error({ err }, 'Failed to attach clinic context');
    throw new AppError('Clinic context error', 500);
  }
}

/**
 * Enforces clinic isolation on queries
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
 *   request.server.db('patients'),
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
