import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import {
  listInventoryHandler,
  getInventoryItemHandler,
  createInventoryItemHandler,
  updateInventoryItemHandler,
  restockInventoryItemHandler,
  deleteInventoryItemHandler,
  getInventoryAlertsHandler,
} from './inventory.controller.js';

export async function inventoryRoutes(fastify) {
  const readAuth  = [authenticate, authorize('inventory:read')];
  const writeAuth = [authenticate, authorize('inventory:*')];

  fastify.get('/',           { preHandler: readAuth  }, listInventoryHandler);
  fastify.get('/alerts',     { preHandler: readAuth  }, getInventoryAlertsHandler);
  fastify.get('/:id',        { preHandler: readAuth  }, getInventoryItemHandler);
  fastify.post('/',          { preHandler: writeAuth }, createInventoryItemHandler);
  fastify.put('/:id',        { preHandler: writeAuth }, updateInventoryItemHandler);
  fastify.post('/:id/restock', { preHandler: writeAuth }, restockInventoryItemHandler);
  fastify.delete('/:id',     { preHandler: writeAuth }, deleteInventoryItemHandler);
}
