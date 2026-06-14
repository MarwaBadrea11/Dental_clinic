import crypto from 'crypto';
import fs from 'fs';

// Generate JWT keys
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

console.log('🔐 JWT Keys for Authentication');
console.log('================================');
console.log('JWT_PRIVATE_KEY=' + privateKey.replace(/\n/g, '\\n'));
console.log('\nJWT_PUBLIC_KEY=' + publicKey.replace(/\n/g, '\\n'));
console.log('\n================================');

// Generate hardware salt for license binding
console.log('\n🔧 Hardware License Configuration');
console.log('================================');
const hardwareSalt = crypto.randomBytes(32).toString('hex');
console.log(`HARDWARE_SALT=${hardwareSalt}`);

// Create a simple hardware-bound license for testing
const testFingerprint = crypto.createHash('sha256').update('TEST_HARDWARE').digest('hex');
const testTimestamp = Date.now();
const testKeyHash = crypto
  .createHash('sha256')
  .update(testFingerprint)
  .update(hardwareSalt)
  .update(testTimestamp.toString())
  .digest('hex')
  .substring(0, 32);

const testLicenseKey = `HARDWARE-${testKeyHash}-${testTimestamp.toString(16).toUpperCase()}`;

console.log('\n🧪 Test Hardware-Bound License Key:');
console.log('================================');
console.log(testLicenseKey);
console.log('\n💡 Note: For production, use: npm run license:generate-hardware-key');

// Save all keys to file
fs.writeFileSync('temp-keys.txt', 
  'JWT_PRIVATE_KEY=' + privateKey.replace(/\n/g, '\\n') + '\n\n' +
  'JWT_PUBLIC_KEY=' + publicKey.replace(/\n/g, '\\n') + '\n\n' +
  'HARDWARE_SALT=' + hardwareSalt + '\n\n' +
  'TEST_HARDWARE_LICENSE=' + testLicenseKey + '\n\n' +
  'Instructions:\n' +
  '1. Copy the JWT keys to your .env file\n' +
  '2. Copy HARDWARE_SALT to .env for production\n' +
  '3. Use npm run license:generate-hardware-key to create hardware-bound licenses'
);

console.log('\n📄 Keys also saved to temp-keys.txt');