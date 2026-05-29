import { createReadStream } from 'node:fs';
import { join } from 'node:path';
import { AttachmentsService } from './attachments.service.js';
import { AttachmentsRepository } from './attachments.repository.js';
import { successResponse, errorResponse } from '../../utils/response.js';
import { env } from '../../config/env.js';

const UPLOADS_DIR = join(process.cwd(), env.UPLOAD_DIR);

function getService(request) {
  return new AttachmentsService(new AttachmentsRepository(request.server.db));
}

export async function listAttachmentsHandler(request, reply) {
  const { id: patientId } = request.params;
  const records = await getService(request).listByPatient(patientId);
  return reply.status(200).send(successResponse(records));
}

export async function uploadAttachmentHandler(request, reply) {
  const { id: patientId } = request.params;
  const uploadedBy = request.user?.sub ?? null;

  // @fastify/multipart: iterate parts
  const parts = request.parts();
  let filePart = null;
  const fields = {};

  for await (const part of parts) {
    if (part.type === 'file') {
      filePart = part;
      break; // process one file at a time; fields before the file are already collected
    } else {
      fields[part.fieldname] = part.value;
    }
  }

  if (!filePart) {
    return reply.status(400).send(errorResponse('No file provided'));
  }

  const record = await getService(request).upload({
    patientId,
    uploadedBy,
    file: filePart,
    treatmentPlanId: fields.treatment_plan_id,
    appointmentId:   fields.appointment_id,
    toothNumber:     fields.tooth_number,
    notes:           fields.notes,
  });

  return reply.status(201).send(successResponse(record));
}

export async function deleteAttachmentHandler(request, reply) {
  const { attachmentId } = request.params;
  await getService(request).delete(attachmentId);
  return reply.status(204).send();
}

export async function downloadAttachmentHandler(request, reply) {
  const { attachmentId } = request.params;
  const repo = new AttachmentsRepository(request.server.db);
  const record = await repo.findById(attachmentId);

  if (!record) {
    return reply.status(404).send(errorResponse('Attachment not found'));
  }

  const filePath = join(UPLOADS_DIR, record.storage_key);

  // Encode filename for Content-Disposition (handles non-ASCII names)
  const encodedName = encodeURIComponent(record.file_name).replace(/'/g, '%27');

  reply
    .header('Content-Type', record.mime_type)
    .header('Content-Disposition', `attachment; filename*=UTF-8''${encodedName}`)
    .header('Cache-Control', 'private, no-cache');

  return reply.send(createReadStream(filePath));
}
