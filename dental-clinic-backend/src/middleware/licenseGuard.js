import fp from 'fastify-plugin';
import { LicenseRepository } from '../modules/license/license.repository.js';
import { LicenseService } from '../modules/license/license.service.js';

async function licenseGuard(fastify) {
  let repository;
  let service;
  let isInitialized = false;

  // Try to initialize license service, but don't crash if it fails
  // Use a delayed initialization approach to prevent boot crashes
  setTimeout(() => {
    try {
      repository = new LicenseRepository(fastify.db);
      service = new LicenseService(repository);
      isInitialized = true;
      fastify.log.info('License guard initialized successfully (delayed initialization)');
    } catch (error) {
      fastify.log.warn('License guard initialization warning:', error.message);
      fastify.log.info('System will start, but license verification will be disabled');
      // Don't crash - allow system to operate without license verification
    }
  }, 1000); // Delay initialization by 1 second to let server fully boot

  // Track background validation to prevent multiple simultaneous checks
  let isBackgroundValidationRunning = false;
  let lastBackgroundValidation = 0;

  // Public routes that don't require license check - ALLOW THESE EVEN WHEN NOT ACTIVATED
  const PUBLIC_ROUTES = [
    '/api/v1/license/activate',
    '/api/v1/license/status',
    '/api/v1/license/health',
    '/api/v1/license/device-id',
    '/api/v1/auth/login',
    '/api/v1/health',
    '/api/v1/auth/register',
  ];

  // Check if route is public
  function isPublicRoute(url) {
    return PUBLIC_ROUTES.some(route => url.startsWith(route));
  }

  // Perform background validation (non-blocking)
  async function performBackgroundValidation() {
    if (!isInitialized || isBackgroundValidationRunning) {
      return;
    }

    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    // Don't run more than once per hour
    if (now - lastBackgroundValidation < oneHour) {
      return;
    }

    isBackgroundValidationRunning = true;
    try {
      await service.performBackgroundValidation();
      lastBackgroundValidation = now;
    } catch (error) {
      fastify.log.error('Background license validation failed:', error);
    } finally {
      isBackgroundValidationRunning = false;
    }
  }

  // Main license guard middleware
  fastify.addHook('onRequest', async (request, reply) => {
    const { url } = request;
    
    // Skip license check for public routes - ALWAYS allow these even when system not activated
    if (isPublicRoute(url)) {
      return;
    }

    // If license system is not initialized yet (delayed initialization), allow access
    // This prevents blocking requests during server boot
    if (!isInitialized) {
      fastify.log.debug('License system not initialized yet (delayed init), allowing access');
      return;
    }

    try {
      // Get current license status
      const licenseStatus = await service.checkLicenseStatus();
      
      // Block request if license is not active
      if (!licenseStatus.valid || licenseStatus.status !== 'ACTIVE') {
        return reply.status(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'System Not Activated. Please activate your license to access clinical features.',
          code: 'SYSTEM_NOT_ACTIVATED',
          requiresActivation: true,
          licenseStatus: licenseStatus.status,
        });
      }

      // MODIFIED: Removed 7-day background validation check
      // License is valid forever once activated, no need for periodic validation
      console.log('✅ License guard: License is active and valid forever (7-day validation bypassed)');

      // Attach license info to request for other handlers
      request.license = {
        status: licenseStatus.status,
        activatedAt: licenseStatus.activatedAt,
        expiresAt: licenseStatus.expiresAt,
        maxUsers: licenseStatus.maxUsers,
        customerName: licenseStatus.customerName,
      };

    } catch (error) {
      fastify.log.error('License guard error:', error);
      
      // In ALL environments, allow access if license check fails to prevent system lockout
      // This ensures the system can at least be accessed to fix license issues
      fastify.log.warn('License check failed, allowing access to prevent system lockout:', error.message);
      return;
      
      // Note: We're removing the production block to ensure system accessibility
      // The frontend will still show activation prompt based on license status API
    }
  });

  // Add a health check endpoint that includes license status
  fastify.get('/api/v1/license/guard-health', async (request, reply) => {
    try {
      const licenseStatus = await service.checkLicenseStatus();
      
      return {
        status: 'ok',
        license: licenseStatus,
        guard: {
          isActive: true,
          lastBackgroundValidation: new Date(lastBackgroundValidation).toISOString(),
          isBackgroundValidationRunning,
          needsValidation: false, // Always false - no validation needed for activated licenses
          note: 'License valid forever once activated (7-day check removed)',
          publicRoutes: PUBLIC_ROUTES,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  });
}

export default fp(licenseGuard, {
  name: 'license-guard',
  dependencies: ['knex']
});