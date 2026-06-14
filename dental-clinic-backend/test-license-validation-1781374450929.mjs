// Test script to validate the generated license key
import { hardwareIdService } from '../src/utils/hardwareId.js';

async function testLicenseKey() {
  const licenseKey = 'HARDWARE-561eadaf7bcb77d51c1f349efe36fe59-19EC230FCED';
  const hardwareFingerprint = '5c8b15d75458536b69cd5dbe72c38247b7614bce1c23c131fddeead31f89675e';
  
  console.log('Testing license key:', licenseKey);
  console.log('Hardware fingerprint:', hardwareFingerprint);
  
  const isValid = hardwareIdService.validateLicenseKey(licenseKey, hardwareFingerprint);
  console.log('✅ License key is', isValid ? 'VALID' : 'INVALID');
  
  return isValid;
}

testLicenseKey().catch(console.error);