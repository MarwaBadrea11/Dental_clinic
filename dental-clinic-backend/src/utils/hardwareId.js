/**
 * Hardware ID Service
 * Generates a unique hardware identifier for license verification
 * Using node-machine-id for stable hardware identification
 */

import nodeMachineId from 'node-machine-id';
import crypto from 'crypto';
import os from 'os';

const { machineId, machineIdSync } = nodeMachineId;

export class HardwareIdService {
  constructor() {
    this.secretSalt = process.env.HARDWARE_SALT || 'SMILEFIX-HARDWARE-SALT-2024';
  }

  /**
   * Get the machine's unique hardware ID
   * Uses machineId with original option for cross-platform compatibility
   */
  async getMachineId() {
    try {
      // Use original mode for cross-platform compatibility
      const id = await machineId({ original: true });
      return id;
    } catch (error) {
      console.error('Failed to get machine ID:', error.message);
      throw new Error('Unable to retrieve hardware identifier');
    }
  }

  /**
   * Get machine ID synchronously
   */
  getMachineIdSync() {
    try {
      return machineIdSync({ original: true });
    } catch (error) {
      console.error('Failed to get machine ID synchronously:', error.message);
      throw new Error('Unable to retrieve hardware identifier');
    }
  }

  /**
   * Generate a hardware fingerprint combining machine ID with system info
   */
  async generateHardwareFingerprint() {
    try {
      const machineId = await this.getMachineId();
      
      // Combine with additional system info for uniqueness
      const systemInfo = {
        machineId,
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
      };

      // Create a fingerprint hash
      const fingerprint = crypto
        .createHash('sha256')
        .update(JSON.stringify(systemInfo))
        .update(this.secretSalt)
        .digest('hex');

      return {
        fingerprint,
        machineId,
        systemInfo,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to generate hardware fingerprint:', error.message);
      
      // Fallback to basic system info if machineId fails
      return this.generateFallbackFingerprint();
    }
  }

  /**
   * Fallback fingerprint if machineId fails
   */
  generateFallbackFingerprint() {
    const systemInfo = {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      networkInterfaces: Object.keys(os.networkInterfaces()).length,
    };

    const fingerprint = crypto
      .createHash('sha256')
      .update(JSON.stringify(systemInfo))
      .update(this.secretSalt)
      .digest('hex');

    return {
      fingerprint,
      machineId: null,
      systemInfo,
      timestamp: new Date().toISOString(),
      isFallback: true
    };
  }

  /**
   * Validate a license key against hardware fingerprint
   */
  validateLicenseKey(licenseKey, hardwareFingerprint) {
    // Expected format: HARDWARE-{hash}-{timestamp}
    if (!licenseKey.startsWith('HARDWARE-')) {
      return false;
    }

    const parts = licenseKey.split('-');
    if (parts.length !== 3) {
      return false;
    }

    const keyHash = parts[1];
    const timestamp = parseInt(parts[2], 16);
    
    // Verify timestamp is not too old (within 24 hours for generation)
    const currentTime = Date.now();
    const keyTime = timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (currentTime - keyTime > maxAge) {
      console.warn('License key is too old');
      return false;
    }

    // Expected hash = SHA256(hardwareFingerprint + secretSalt + timestamp)
    const expectedHash = crypto
      .createHash('sha256')
      .update(hardwareFingerprint)
      .update(this.secretSalt)
      .update(timestamp.toString())
      .digest('hex')
      .substring(0, 32); // Use first 32 chars for readability

    return keyHash === expectedHash;
  }

  /**
   * Generate a license key from hardware fingerprint
   */
  generateLicenseKey(hardwareFingerprint) {
    const timestamp = Date.now();
    
    const hash = crypto
      .createHash('sha256')
      .update(hardwareFingerprint)
      .update(this.secretSalt)
      .update(timestamp.toString())
      .digest('hex')
      .substring(0, 32); // Use first 32 chars for readability

    // Format: HARDWARE-{hash}-{timestamp in hex}
    return `HARDWARE-${hash}-${timestamp.toString(16).toUpperCase()}`;
  }

  /**
   * Get current hardware info for display/logging
   */
  async getHardwareInfo() {
    try {
      const machineId = await this.getMachineId();
      return {
        machineId: machineId || null,   // normalise empty string → null
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        cpuModel: os.cpus()[0]?.model || 'Unknown',
        totalMemory: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + ' GB',
        freeMemory: Math.round(os.freemem() / (1024 * 1024 * 1024)) + ' GB',
        uptime: Math.round(os.uptime() / 3600) + ' hours',
        networkInterfaces: Object.keys(os.networkInterfaces()).length,
        isFallback: false,
      };
    } catch (error) {
      console.error('Failed to get hardware info:', error.message);
      return this.getFallbackHardwareInfo();
    }
  }

  getFallbackHardwareInfo() {
    return {
      machineId: null,
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      cpuModel: os.cpus()[0]?.model || 'Unknown',
      totalMemory: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + ' GB',
      freeMemory: Math.round(os.freemem() / (1024 * 1024 * 1024)) + ' GB',
      uptime: Math.round(os.uptime() / 3600) + ' hours',
      networkInterfaces: Object.keys(os.networkInterfaces()).length,
      isFallback: true
    };
  }
}

// Export singleton instance
export const hardwareIdService = new HardwareIdService();