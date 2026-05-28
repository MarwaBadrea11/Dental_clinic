import { AuthenticationError } from '../utils/errors.js';

/** @type {Map<string, number>} jti -> expiry ms */
export const jtiDenyList = new Map();

function pruneExpiredJtis() {
  const now = Date.now();
  for (const [jti, exp] of jtiDenyList) {
    if (exp < now) jtiDenyList.delete(jti);
  }
}

export function denyJti(jti, expSeconds) {
  pruneExpiredJtis();
  jtiDenyList.set(jti, expSeconds * 1000);
}

export async function authenticate(request, reply) {
  try {
    await request.jwtVerify();

    const payload = request.user;

    if (payload.jti && jtiDenyList.has(payload.jti)) {
      throw new AuthenticationError('Token has been revoked');
    }
  } catch (err) {
    if (err instanceof AuthenticationError) {
      void reply.status(401).send({ success: false, data: null, error: err.message, meta: null });
      return;
    }
    void reply.status(401).send({ success: false, data: null, error: 'Unauthorized', meta: null });
  }
}
