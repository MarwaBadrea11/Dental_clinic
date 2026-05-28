export async function healthRoutes(fastify) {
  fastify.get('/health', async (_request, reply) => {
    return reply.status(200).send({
      success: true,
      data: { status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() },
      error: null,
      meta: null,
    });
  });
}
