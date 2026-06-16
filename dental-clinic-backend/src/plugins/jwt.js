import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { env } from '../config/env.js';

async function jwtPlugin(fastify) {
  // Always use RS256 with RSA key pair
  const config = {
    secret: {
      private: env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n'),
      public: env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n'),
    },
    sign: {
      algorithm: 'RS256',
      expiresIn: env.JWT_ACCESS_EXPIRY,
    },
  };
  
  await fastify.register(fastifyJwt, config);
}

export default fp(jwtPlugin, { name: 'jwt' });
