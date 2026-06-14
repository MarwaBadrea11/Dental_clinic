// Test script to validate the generated license key
import { hardwareIdService } from '../src/utils/hardwareId.js';

async function testLicenseKey() {
  const licenseKey = 'HARDWARE-1b9943dd8ce3c29a76ed73a3bb2eeed4-19EC2C02E36';
  const hardwareFingerprint = '8bb435cda4ece1f8088df0177956c443c21b38916611458a4ee820b48a8a2c19';
  
  console.log('Testing license key:', licenseKey);
  console.log('Hardware fingerprint:', hardwareFingerprint);
  
  const isValid = hardwareIdService.validateLicenseKey(licenseKey, hardwareFingerprint);
  console.log('✅ License key is', isValid ? 'VALID' : 'INVALID');
  
  return isValid;
}

testLicenseKey().catch(console.error);