// Test script to validate the generated license key
import { hardwareIdService } from '../src/utils/hardwareId.js';

async function testLicenseKey() {
  const licenseKey = 'HARDWARE-f7c2d22bb0f8edf8f50f1c295b5beaa0-19EC249B681';
  const hardwareFingerprint = 'e6af00c46dc6ee04e62fb45c96cb3ed57d1c7e0afbb8d45c81c3a23cb26d0302';
  
  console.log('Testing license key:', licenseKey);
  console.log('Hardware fingerprint:', hardwareFingerprint);
  
  const isValid = hardwareIdService.validateLicenseKey(licenseKey, hardwareFingerprint);
  console.log('✅ License key is', isValid ? 'VALID' : 'INVALID');
  
  return isValid;
}

testLicenseKey().catch(console.error);