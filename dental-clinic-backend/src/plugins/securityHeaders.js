import fp from 'fastify-plugin';

async function securityHeadersPlugin(fastify) {
  fastify.addHook('onSend', async (_request, reply) => {
    void reply.header('X-Content-Type-Options', 'nosniff');
    void reply.header('X-Frame-Options', 'DENY');
    void reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    void reply.header('X-XSS-Protection', '1; mode=block');
    void reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  });
}

export default fp(securityHeadersPlugin, { name: 'security-headers' });
