#!/usr/bin/env node

/**
 * Hardware-Bound License Key Generator
 * 
 * This script generates hardware-bound license keys for offline sales.
 * The key is bound to the specific computer hardware and cannot be transferred.
 * 
 * Usage: npm run license:generate-hardware-key
 */

import { hardwareIdService } from '../src/utils/hardwareId.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

async function generateHardwareKey(options = {}) {
  console.log('=======================================');
  console.log('   Hardware-Bound License Generator    ');
  console.log('=======================================');
  
  try {
    let hardwareInfo;
    let hardwareFingerprint;
    
    if (options.machineId) {
      // Generate key for specific machine ID
      console.log('\n🔧 Generating license for specified machine ID:', options.machineId);
      hardwareInfo = {
        machineId: options.machineId,
        hostname: 'Specified-Machine',
        platform: 'custom',
        arch: 'custom',
        cpus: 0,
        cpuModel: 'Custom Machine',
        totalMemory: 'N/A',
        isCustom: true
      };
      
      // Create fingerprint from machine ID
      const crypto = await import('crypto');
      hardwareFingerprint = {
        fingerprint: crypto.createHash('sha256')
          .update(options.machineId)
          .update(process.env.HARDWARE_SALT || 'SMILEFIX-HARDWARE-SALT-2024-SECURE-KEY')
          .digest('hex'),
        machineId: options.machineId,
        isCustom: true
      };
      
    } else if (options.fingerprint) {
      // Use specified fingerprint
      console.log('\n🔧 Using specified hardware fingerprint:', options.fingerprint.substring(0, 32) + '...');
      hardwareFingerprint = {
        fingerprint: options.fingerprint,
        machineId: null,
        isCustom: true
      };
      hardwareInfo = {
        machineId: null,
        hostname: 'Specified-Fingerprint',
        platform: 'custom',
        arch: 'custom',
        isCustom: true
      };
      
    } else {
      // Get hardware information from current machine
      console.log('\n📋 Getting hardware information...');
      hardwareInfo = await hardwareIdService.getHardwareInfo();
      
      // Generate hardware fingerprint
      console.log('\n🔑 Generating hardware fingerprint...');
      hardwareFingerprint = await hardwareIdService.generateHardwareFingerprint();
    }
    
    console.log('\n🖥️  Hardware Information:');
    console.log('---------------------------------------');
    console.log(`Hostname: ${hardwareInfo.hostname}`);
    
    if (hardwareInfo.isCustom) {
      console.log(`Platform: ${hardwareInfo.platform} (Custom Machine)`);
      console.log(`Machine ID: ${hardwareInfo.machineId || 'Custom Fingerprint'}`);
    } else {
      console.log(`Platform: ${hardwareInfo.platform} (${hardwareInfo.arch})`);
      if (hardwareInfo.cpus !== undefined) console.log(`CPU Cores: ${hardwareInfo.cpus} (${hardwareInfo.cpuModel || 'Unknown'})`);
      if (hardwareInfo.totalMemory !== undefined) console.log(`Total Memory: ${hardwareInfo.totalMemory}`);
      console.log(`Machine ID: ${hardwareInfo.machineId || 'Not available (using fallback)'}`);
    }
    
    if (hardwareInfo.isFallback) {
      console.log('\n⚠️  Warning: Using fallback hardware identification');
      console.log('   Some hardware information may not be available.');
    } else if (hardwareInfo.isCustom) {
      console.log('\n🔧 Using custom hardware information for license generation');
    }
    console.log(`Fingerprint: ${hardwareFingerprint.fingerprint}`);
    
    if (hardwareFingerprint.isFallback) {
      console.log('⚠️  Using fallback fingerprint method');
    } else if (hardwareFingerprint.isCustom) {
      console.log('🔧 Using custom fingerprint for license generation');
    }
    
    // Generate license key
    console.log('\n🔐 Generating license key...');
    const licenseKey = hardwareIdService.generateLicenseKey(hardwareFingerprint.fingerprint);
    
    console.log('\n✅ Generated Hardware-Bound License Key:');
    console.log('=======================================');
    console.log(licenseKey);
    console.log('=======================================');
    
    // Save to file
    const outputDir = process.env.LICENSE_KEYS_DIR || '.';
    const outputFile = path.join(outputDir, `hardware-license-${Date.now()}.txt`);
    
    const licenseData = {
      generatedAt: new Date().toISOString(),
      licenseKey,
      hardwareFingerprint: hardwareFingerprint.fingerprint,
      hardwareInfo,
      secretSalt: process.env.HARDWARE_SALT || 'SMILEFIX-HARDWARE-SALT-2024',
      notes: 'This license key is bound to the specific hardware and cannot be transferred.'
    };
    
    fs.writeFileSync(outputFile, JSON.stringify(licenseData, null, 2));
    console.log(`\n📄 License details saved to: ${outputFile}`);
    
    // Show usage instructions
    console.log('\n📋 Usage Instructions:');
    console.log('---------------------------------------');
    if (options.machineId || options.fingerprint) {
      console.log('1. ✅ License generated for specified machine/fingerprint');
      console.log('2. 📱 Send this license key to the client');
      console.log('3. 🔑 Client enters key in activation screen');
      console.log('4. 🔒 Key works ONLY on specified hardware');
      console.log('5. 🚫 Automatic lockout if copied to another PC');
    } else {
      console.log('1. 🔧 This license key is HARDWARE-BOUND');
      console.log('2. 💻 It will ONLY work on this specific computer');
      console.log('3. 🚫 If copied to another PC, it will NOT work');
      console.log('4. 🔐 Store this key securely for future reference');
      console.log('5. ✅ To activate: Enter this key in the license activation screen');
    }
    
    // Show validation command
    console.log('\n🛠️  Validation Command:');
    console.log('---------------------------------------');
    console.log(`const isValid = hardwareIdService.validateLicenseKey('${licenseKey}', '${hardwareFingerprint.fingerprint}');`);
    console.log(`console.log('Valid:', isValid);`);
    
    // Generate test script
    const testScript = `// Test script to validate the generated license key
import { hardwareIdService } from '../src/utils/hardwareId.js';

async function testLicenseKey() {
  const licenseKey = '${licenseKey}';
  const hardwareFingerprint = '${hardwareFingerprint.fingerprint}';
  
  console.log('Testing license key:', licenseKey);
  console.log('Hardware fingerprint:', hardwareFingerprint);
  
  const isValid = hardwareIdService.validateLicenseKey(licenseKey, hardwareFingerprint);
  console.log('✅ License key is', isValid ? 'VALID' : 'INVALID');
  
  return isValid;
}

testLicenseKey().catch(console.error);`;
    
    const testFile = path.join(outputDir, `test-license-validation-${Date.now()}.mjs`);
    fs.writeFileSync(testFile, testScript);
    console.log(`\n🧪 Test validation script saved to: ${testFile}`);
    
    console.log('\n🎉 Hardware-bound license key generation complete!');
    
  } catch (error) {
    console.error('\n❌ Error generating hardware license key:');
    console.error(error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('1. Make sure node-machine-id package is installed');
    console.error('2. Run with administrator/sudo privileges if needed');
    console.error('3. Check system permissions for hardware access');
    process.exit(1);
  }
}

// Add CLI argument support
const args = process.argv.slice(2);
const command = args[0];

if (command === '--help' || command === '-h') {
  console.log(`
Hardware-Bound License Generator

Usage:
  npm run license:generate-hardware-key
  node scripts/generate-hardware-key.mjs

Description:
  Generates a hardware-bound license key that is tied to the specific
  computer hardware. The key cannot be transferred to another machine.

Options:
  --help, -h           Show this help message
  --info               Show hardware information only
  --validate KEY       Validate a license key against current hardware
  --id=MACHINE_ID      Generate license key for a specific machine ID
  --fingerprint=FP     Use specific hardware fingerprint

Examples:
  # Generate a new hardware-bound license key for current machine
  npm run license:generate-hardware-key

  # Show hardware information only
  node scripts/generate-hardware-key.mjs --info

  # Validate a license key
  node scripts/generate-hardware-key.mjs --validate HARDWARE-ABC123...

  # Generate license for specific machine ID (developer use)
  node scripts/generate-hardware-key.mjs --id=338010fa-92d0-4e67-9ca3-8115abc201af
  node scripts/generate-hardware-key.mjs --fingerprint=d033f0a68b210d8a8e03e82ff0772f42...

  # Generate license for client (offline sales)
  npm run license:generate-hardware-key -- --id=CLIENT_MACHINE_ID
  `);
  process.exit(0);
}

if (command === '--info') {
  // Just show hardware information
  (async () => {
    const hardwareInfo = await hardwareIdService.getHardwareInfo();
    console.log(JSON.stringify(hardwareInfo, null, 2));
  })().catch(console.error);
} else if (command === '--validate') {
  const licenseKey = args[1];
  if (!licenseKey) {
    console.error('Error: License key required for validation');
    process.exit(1);
  }
  
  (async () => {
    const hardwareFingerprint = await hardwareIdService.generateHardwareFingerprint();
    const isValid = hardwareIdService.validateLicenseKey(licenseKey, hardwareFingerprint.fingerprint);
    console.log(isValid ? '✅ License key is VALID for this hardware' : '❌ License key is INVALID for this hardware');
    process.exit(isValid ? 0 : 1);
  })().catch(console.error);
} else if (command?.startsWith('--id=')) {
  // Generate for specific machine ID
  const machineId = command.substring(5);
  generateHardwareKey({ machineId }).catch(console.error);
} else if (command?.startsWith('--fingerprint=')) {
  // Generate for specific fingerprint
  const fingerprint = command.substring(13);
  generateHardwareKey({ fingerprint }).catch(console.error);
} else {
  // Default: generate new key for current machine
  generateHardwareKey().catch(console.error);
}