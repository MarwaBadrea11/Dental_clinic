import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { env } from '../config/env.js';

async function jwtPlugin(fastify) {
  await fastify.register(fastifyJwt, {
    secret: {
      private: env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n'),
      public: env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n'),
    },
    sign: {
      algorithm: 'RS256',
      expiresIn: env.JWT_ACCESS_EXPIRY,
    },
  });
}

export default fp(jwtPlugin, { name: 'jwt' });
