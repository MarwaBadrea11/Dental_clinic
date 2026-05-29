import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import {
  listAttachmentsHandler,
  uploadAttachmentHandler,
  deleteAttachmentHandler,
  downloadAttachmentHandler,
} from './attachments.controller.js';

export async function attachmentsRoutes(fastify) {
  // GET  /api/v1/patients/:id/attachments
  fastify.get(
    '/:id/attachments',
    { preHandler: [authenticate, authorize('patients:read')] },
    listAttachmentsHandler,
  );

  // POST /api/v1/patients/:id/attachments  (multipart/form-data)
  fastify.post(
    '/:id/attachments',
    { preHandler: [authenticate, authorize('patients:*')] },
    uploadAttachmentHandler,
  );

  // GET  /api/v1/patients/:id/attachments/:attachmentId/download
  fastify.get(
    '/:id/attachments/:attachmentId/download',
    { preHandler: [authenticate, authorize('patients:read')] },
    downloadAttachmentHandler,
  );

  // DELETE /api/v1/patients/:id/attachments/:attachmentId
  fastify.delete(
    '/:id/attachments/:attachmentId',
    { preHandler: [authenticate, authorize('patients:*')] },
    deleteAttachmentHandler,
  );
}
