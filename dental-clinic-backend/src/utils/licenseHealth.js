import { LicenseRepository } from '../modules/license/license.repository.js';
import { LicenseService } from '../modules/license/license.service.js';

export async function checkSystemLicenseHealth(knex) {
  const repository = new LicenseRepository(knex);
  const service = new LicenseService(repository);
  
  try {
    const licenseStatus = await service.checkLicenseStatus();
    
    // MODIFIED: Removed 7-day validation check
    // Once activated, license is valid forever
    const health = {
      status: licenseStatus.valid && licenseStatus.status === 'ACTIVE' ? 'healthy' : 'unhealthy',
      license: licenseStatus,
      validation: {
        needsValidation: false, // Always false - no validation needed for activated licenses
        lastVerified: licenseStatus.lastVerifiedAt || null,
        note: 'License valid forever once activated (7-day check removed)',
      },
      timestamp: new Date().toISOString(),
    };

    return health;
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}