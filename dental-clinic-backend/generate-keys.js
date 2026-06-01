import crypto from 'crypto';

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

console.log('JWT_PRIVATE_KEY=' + privateKey.replace(/\n/g, '\\n'));
console.log('JWT_PUBLIC_KEY=' + publicKey.replace(/\n/g, '\\n'));