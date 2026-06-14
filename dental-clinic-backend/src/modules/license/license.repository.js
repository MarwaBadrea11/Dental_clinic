import { AppError } from '../../utils/errors.js';

export class LicenseRepository {
  constructor(knex) {
    this.knex = knex;
  }

  async getLicenseInfo() {
    const license = await this.knex('license_info')
      .select('*')
      .orderBy('created_at', 'desc')
      .first();
    
    if (!license) {
      // Create initial license record if none exists
      return await this.createInitialLicense();
    }
    
    return license;
  }

  async createInitialLicense() {
    const [license] = await this.knex('license_info')
      .insert({
        server_id: this.knex.raw('gen_random_uuid()'),
        status: 'PENDING'
      })
      .returning('*');
    
    return license;
  }

  async updateLicense(key, data) {
    const updateData = {
      license_key: key,
      status: data.status,
      activated_at: data.activated_at,
      last_verified_at: data.last_verified_at,
      customer_name: data.customerName,
      customer_email: data.customerEmail,
      expires_at: data.expiresAt,
      max_users: data.maxUsers,
      metadata: data.metadata,
      updated_at: this.knex.fn.now()
    };

    // Add hardware info if present
    if (data.isHardwareBound) {
      updateData.is_hardware_bound = true;
      if (data.hardwareFingerprint) {
        updateData.hardware_fingerprint = data.hardwareFingerprint;
      }
      if (data.hardwareMachineId) {
        updateData.hardware_machine_id = data.hardwareMachineId;
      }
      if (data.hardwareInfo) {
        updateData.hardware_info = data.hardwareInfo;
      }
    }

    const [updated] = await this.knex('license_info')
      .where({ id: data.id })
      .update(updateData)
      .returning('*');
    
    return updated;
  }

  async updateVerificationTime() {
    await this.knex('license_info')
      .update({
        last_verified_at: this.knex.fn.now()
      });
  }

  async revokeLicense() {
    await this.knex('license_info')
      .update({
        status: 'REVOKED',
        updated_at: this.knex.fn.now()
      });
  }
}