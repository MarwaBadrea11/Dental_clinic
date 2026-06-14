import { LicenseRepository } from './license.repository.js';
import { LicenseService } from './license.service.js';
import { hardwareIdService } from '../../utils/hardwareId.js';
import { successResponse, errorResponse } from '../../utils/response.js';

export class LicenseController {
  constructor(knex) {
    this.repository = new LicenseRepository(knex);
    this.service = new LicenseService(this.repository);
  }

  async activateLicense(request, reply) {
    try {
      const { licenseKey, customerName, customerEmail } = request.body;
      
      const license = await this.service.activateLicense(licenseKey, {
        customerName,
        customerEmail,
      });

      return reply.status(200).send(successResponse({
        status: license.status,
        activatedAt: license.activated_at,
        expiresAt: license.expires_at,
        maxUsers: license.max_users,
        customerName: license.customer_name,
      }));
    } catch (error) {
      request.log.error(error);
      return reply.status(error.statusCode || 500).send(
        errorResponse(error.message || 'Failed to activate license')
      );
    }
  }

  async getLicenseStatus(request, reply) {
    try {
      const status = await this.service.checkLicenseStatus();
      
      return reply.status(200).send(successResponse(status));
    } catch (error) {
      request.log.error(error);
      return reply.status(error.statusCode || 500).send(
        errorResponse(error.message || 'Failed to get license status')
      );
    }
  }

  async checkLicenseHealth(request, reply) {
    try {
      const status = await this.service.checkLicenseStatus();
      const isValid = status.valid && status.status === 'ACTIVE';
      
      return reply.status(200).send({
        status: isValid ? 'healthy' : 'unhealthy',
        license: status,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return reply.status(200).send({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getDeviceId(request, reply) {
    try {
      const hardwareInfo = await hardwareIdService.getHardwareInfo();

      // Guarantee a non-empty deviceId: prefer machineId, fall back to hostname,
      // then a timestamp-based local ID so the frontend never receives an empty string.
      const deviceId =
        (hardwareInfo.machineId && hardwareInfo.machineId.trim()) ||
        (hardwareInfo.hostname  && hardwareInfo.hostname.trim())  ||
        `LOCAL-${Date.now().toString(16)}`

      return reply.status(200).send(successResponse({
        deviceId,
        activationRequestCode: deviceId,
        hardwareInfo: {
          hostname:    hardwareInfo.hostname,
          platform:    hardwareInfo.platform,
          cpuCores:    hardwareInfo.cpus,
          cpuModel:    hardwareInfo.cpuModel,
          totalMemory: hardwareInfo.totalMemory,
          machineId:   hardwareInfo.machineId,
          isFallback:  hardwareInfo.isFallback || false,
        },
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send(
        errorResponse('Failed to retrieve device ID. Please try again.')
      );
    }
  }
}