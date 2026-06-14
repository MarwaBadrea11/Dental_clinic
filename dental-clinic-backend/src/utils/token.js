import { createSigner, createVerifier } from 'fast-jwt';
import { randomUUID } from 'crypto';
import { env } from '../config/env.js';

// For development, use HS256 with a simple secret
// In production, use RS256 with proper RSA keys
const algorithm = env.NODE_ENV === 'development' ? 'HS256' : 'RS256';
const key = env.NODE_ENV === 'development' ? env.JWT_PRIVATE_KEY : env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n');

const signer = createSigner({
  algorithm: algorithm,
  key: key,
  expiresIn: env.JWT_ACCESS_EXPIRY,
});

const verifier = createVerifier({
  algorithms: [algorithm],
  key: env.NODE_ENV === 'development' ? env.JWT_PUBLIC_KEY : env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n'),
});

export function signAccessToken(payload) {
  return signer({ ...payload, jti: randomUUID() });
}

export function verifyAccessToken(token) {
  return verifier(token);
}
