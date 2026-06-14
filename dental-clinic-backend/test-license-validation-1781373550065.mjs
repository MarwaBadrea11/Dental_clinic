// Test script to validate the generated license key
import { hardwareIdService } from '../src/utils/hardwareId.js';

async function testLicenseKey() {
  const licenseKey = 'HARDWARE-6a18d32bae8e522acef4e8489887bdda-19EC2233DED';
  const hardwareFingerprint = '8397293f8f3362f41fd3ed92e9ce4ff8804f94010c62ba39032fdf4ee6ea9b64';
  
  console.log('Testing license key:', licenseKey);
  console.log('Hardware fingerprint:', hardwareFingerprint);
  
  const isValid = hardwareIdService.validateLicenseKey(licenseKey, hardwareFingerprint);
  console.log('✅ License key is', isValid ? 'VALID' : 'INVALID');
  
  return isValid;
}

testLicenseKey().catch(console.error);