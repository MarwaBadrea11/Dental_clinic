import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import {
  listNotesHandler,
  createNoteHandler,
  deleteNoteHandler,
} from './notes.controller.js';

/**
 * Registers patient notes routes under the prefix /api/v1/patients.
 * Final URLs:
 *   GET    /api/v1/patients/:patientId/notes
 *   POST   /api/v1/patients/:patientId/notes
 *   DELETE /api/v1/patients/:patientId/notes/:noteId
 *
 * @param {import('fastify').FastifyInstance} fastify
 */
export async function notesRoutes(fastify) {
  const read  = [authenticate, authorize('patients:read')];
  const write = [authenticate, authorize('patients:*')];

  fastify.get(
    '/:patientId/notes',
    { preHandler: read },
    listNotesHandler,
  );

  fastify.post(
    '/:patientId/notes',
    { preHandler: write },
    createNoteHandler,
  );

  fastify.delete(
    '/:patientId/notes/:noteId',
    { preHandler: write },
    deleteNoteHandler,
  );
}
