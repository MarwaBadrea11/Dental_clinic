// Test script to validate the generated license key
import { hardwareIdService } from '../src/utils/hardwareId.js';

async function testLicenseKey() {
  const licenseKey = 'HARDWARE-cfa74fa7fc18d6a1acc66dad42473768-19EC2B60A4B';
  const hardwareFingerprint = '4a73d576074775925740ac114596c5e68870e1a037e4538b1aa99f305f28e093';
  
  console.log('Testing license key:', licenseKey);
  console.log('Hardware fingerprint:', hardwareFingerprint);
  
  const isValid = hardwareIdService.validateLicenseKey(licenseKey, hardwareFingerprint);
  console.log('✅ License key is', isValid ? 'VALID' : 'INVALID');
  
  return isValid;
}

testLicenseKey().catch(console.error);