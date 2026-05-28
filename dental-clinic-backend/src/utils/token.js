import { createSigner, createVerifier } from 'fast-jwt';
import { randomUUID } from 'crypto';
import { env } from '../config/env.js';

const signer = createSigner({
  algorithm: 'RS256',
  key: env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n'),
  expiresIn: env.JWT_ACCESS_EXPIRY,
});

const verifier = createVerifier({
  algorithms: ['RS256'],
  key: env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n'),
});

export function signAccessToken(payload) {
  return signer({ ...payload, jti: randomUUID() });
}

export function verifyAccessToken(token) {
  return verifier(token);
}
