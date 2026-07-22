import { createSigner, createVerifier } from 'fast-jwt';
import { randomUUID } from 'crypto';
import { env } from '../config/env.js';

// Always use RS256 with RSA key pair
const privateKey = env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n');
const publicKey = env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n');

const signer = createSigner({
  algorithm: 'RS256',
  key: privateKey,
  expiresIn: env.JWT_ACCESS_EXPIRY,
});

const verifier = createVerifier({
  algorithms: ['RS256'],
  key: publicKey,
});

export function signAccessToken(payload) {
  return signer({ ...payload, jti: randomUUID() });
}

export function verifyAccessToken(token) {
  return verifier(token);
}
