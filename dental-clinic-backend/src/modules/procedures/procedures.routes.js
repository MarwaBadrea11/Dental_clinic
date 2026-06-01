import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import {
  CreateProcedureSchema,
  UpdateProcedureSchema,
  ListProceduresSchema
} from './procedures.schema.js';
import {
  listProceduresHandler,
  getProcedureHandler,
  createProcedureHandler,
  updateProcedureHandler,
} from './procedures.controller.js';

export async function proceduresRoutes(fastify) {
  const fastifyZod = fastify.withTypeProvider();

  fastifyZod.get('/', { 
    schema: { querystring: ListProceduresSchema },
    preHandler: [authenticate, authorize('treatments:read')] 
  }, listProceduresHandler);

  fastifyZod.get('/:id', { 
    preHandler: [authenticate, authorize('treatments:read')] 
  }, getProcedureHandler);

  fastifyZod.post('/', { 
    schema: { body: CreateProcedureSchema },
    preHandler: [authenticate, authorize('treatments:*')] 
  }, createProcedureHandler);

  fastifyZod.patch('/:id', { 
    schema: { body: UpdateProcedureSchema },
    preHandler: [authenticate, authorize('treatments:*')] 
  }, updateProcedureHandler);
}