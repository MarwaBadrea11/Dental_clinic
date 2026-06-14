// Hardware-Bound License Key Generator (Legacy format)
const crypto = require('crypto');
const fs = require('fs');

console.log('=======================================');
console.log('   Legacy Key Generator (Use generate-keys.js)');
console.log('=======================================\n');

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

// Generate hardware salt for license binding
console.log('\n🔧 Hardware License Configuration');
console.log('================================');
const hardwareSalt = crypto.randomBytes(32).toString('hex');
console.log(`HARDWARE_SALT=${hardwareSalt}`);

// Save all keys to file
fs.writeFileSync('temp-legacy-keys.txt', 
  'JWT_PRIVATE_KEY=' + privateKey.replace(/\n/g, '\\n') + '\n\n' +
  'JWT_PUBLIC_KEY=' + publicKey.replace(/\n/g, '\\n') + '\n\n' +
  'HARDWARE_SALT=' + hardwareSalt + '\n\n' +
  'NOTICE: This is the legacy key generator.\n' +
  'For hardware-bound licenses, use: npm run license:generate-hardware-key\n' +
  'Or run: node generate-keys.js'
);

console.log('\n📄 Keys saved to temp-legacy-keys.txt');
console.log('\n💡 Note: Use npm run license:generate-hardware-key for hardware-bound licenses');