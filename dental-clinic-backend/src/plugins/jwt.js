import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { env } from '../config/env.js';

async function jwtPlugin(fastify) {
  // For development, use HS256 with a simple secret
  // In production, use RS256 with proper RSA keys
  const algorithm = env.NODE_ENV === 'development' ? 'HS256' : 'RS256';
  
  const config = {
    sign: {
      algorithm: algorithm,
      expiresIn: env.JWT_ACCESS_EXPIRY,
    },
  };
  
  if (env.NODE_ENV === 'development') {
    // HS256 uses a simple secret key
    config.secret = env.JWT_PRIVATE_KEY;
  } else {
    // RS256 uses private/public key pair
    config.secret = {
      private: env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n'),
      public: env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n'),
    };
  }
  
  await fastify.register(fastifyJwt, config);
}

export default fp(jwtPlugin, { name: 'jwt' });
