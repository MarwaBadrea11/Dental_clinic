import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

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

// Read the existing .env file
const envPath = path.join(process.cwd(), '.env');
let envContent = fs.readFileSync(envPath, 'utf8');

// Replace the JWT keys in the .env content
envContent = envContent.replace(
  /JWT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----[^]*?-----END PRIVATE KEY-----/,
  `JWT_PRIVATE_KEY=${privateKey.replace(/\n/g, '\\n')}`
);

envContent = envContent.replace(
  /JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----[^]*?-----END PUBLIC KEY-----/,
  `JWT_PUBLIC_KEY=${publicKey.replace(/\n/g, '\\n')}`
);

// Write the updated .env file
fs.writeFileSync(envPath, envContent);

console.log('✅ JWT keys regenerated and .env file updated successfully!');
console.log('\nGenerated keys preview:');
console.log('Private key (first 100 chars):', privateKey.substring(0, 100) + '...');
console.log('Public key (first 100 chars):', publicKey.substring(0, 100) + '...');