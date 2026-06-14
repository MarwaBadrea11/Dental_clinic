import { activateLicenseSchema } from './license.schema.js';

export async function licenseRoutes(fastify) {
  const { LicenseController } = await import('./license.controller.js');
  const controller = new LicenseController(fastify.db);

  // Public routes
  fastify.post(
    '/activate',
    {
      schema: activateLicenseSchema,
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '15 minutes'
        }
      }
    },
    controller.activateLicense.bind(controller)
  );

  fastify.get(
    '/status',
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: '1 minute'
        }
      }
    },
    controller.getLicenseStatus.bind(controller)
  );

  fastify.get(
    '/health',
    controller.checkLicenseHealth.bind(controller)
  );

  // New endpoint: Get device hardware ID for activation request
  fastify.get(
    '/device-id',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute'
        }
      }
    },
    controller.getDeviceId.bind(controller)
  );
}