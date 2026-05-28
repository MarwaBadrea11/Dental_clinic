import fp from 'fastify-plugin';
import { db } from '../db/db.js';

async function knexPlugin(fastify) {
  await db.raw('SELECT 1');

  fastify.decorate('db', db);

  fastify.addHook('onClose', async () => {
    await db.destroy();
  });
}

export default fp(knexPlugin, { name: 'knex' });
