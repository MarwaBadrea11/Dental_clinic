import { apiClient } from './apiClient'

export interface LicenseStatus {
  status: 'PENDING' | 'ACTIVE' | 'REVOKED' | 'EXPIRED'
  valid: boolean
  activatedAt?: string
  lastVerifiedAt?: string
  expiresAt?: string
  maxUsers?: number
  customerName?: string
  customerEmail?: string
  message?: string
  // Hardware-bound license properties
  isHardwareBound?: boolean
  hardwareFingerprint?: string
  hardwareMismatch?: boolean
  storedHardwareFingerprint?: string
  currentHardwareFingerprint?: string
  hardwareInfo?: any
}

// Shape returned by the backend's /api/v1/license/device-id endpoint.
// apiClient already unwraps the outer { success, data } envelope, so this
// represents the inner payload directly — no extra nesting needed.
export interface DeviceIdPayload {
  deviceId: string
  activationRequestCode: string
  hardwareInfo: {
    hostname: string
    platform: string
    cpuCores: number
    cpuModel: string
    totalMemory: string
    machineId?: string
    isFallback: boolean
  }
  timestamp: string
}

/** @deprecated Use DeviceIdPayload directly. Kept for backwards compatibility. */
export interface DeviceIdResponse {
  message: string
  data: DeviceIdPayload
}

export interface ActivationRequest {
  licenseKey: string
  customerName?: string
  customerEmail?: string
}

export interface ActivationResponse {
  message: string
  data: {
    status: string
    activatedAt: string
    expiresAt?: string
    maxUsers?: number
    customerName?: string
  }
}

class LicenseService {
  async checkLicenseStatus(): Promise<LicenseStatus> {
    try {
      // apiClient already unwraps json.data, so the return value IS the LicenseStatus object
      const status = await apiClient.get<LicenseStatus>('/api/v1/license/status')
      return status
    } catch (error) {
      console.error('Failed to check license status:', error)
      return {
        status: 'PENDING',
        valid: false,
        message: 'Unable to check license status'
      }
    }
  }

  async activateLicense(data: ActivationRequest): Promise<ActivationResponse['data']> {
    // apiClient already unwraps json.data, so the return value IS the inner data object
    const result = await apiClient.post<ActivationResponse['data']>('/api/v1/license/activate', data)
    return result
  }

  async getLicenseHealth(): Promise<any> {
    try {
      const health = await apiClient.get('/api/v1/license/health')
      return health
    } catch (error) {
      console.error('Failed to get license health:', error)
      return { status: 'unhealthy' }
    }
  }

  async getDeviceId(): Promise<DeviceIdPayload> {
    try {
      // apiClient already unwraps json.data, so we receive the inner payload directly.
      const deviceData = await apiClient.get<DeviceIdPayload>('/api/v1/license/device-id')

      // Defensive: backend may return an empty string if node-machine-id fails silently.
      // Ensure activationRequestCode is always a non-empty displayable string.
      const code =
        deviceData?.activationRequestCode ||
        deviceData?.deviceId ||
        `LOCAL-${Date.now().toString(16)}`

      return {
        ...deviceData,
        deviceId: deviceData?.deviceId || code,
        activationRequestCode: code,
      }
    } catch (error: any) {
      console.error('Failed to get device ID:', error)
      const fallbackId = `FALLBACK-${Date.now().toString(16)}`
      return {
        deviceId: fallbackId,
        activationRequestCode: fallbackId,
        hardwareInfo: {
          hostname: 'Unknown',
          platform: 'unknown',
          cpuCores: 0,
          cpuModel: 'Unknown',
          totalMemory: '0 GB',
          isFallback: true,
        },
        timestamp: new Date().toISOString(),
      }
    }
  }
}

export const licenseService = new LicenseService()