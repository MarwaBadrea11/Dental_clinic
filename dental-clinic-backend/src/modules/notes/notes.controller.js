import { NotesService } from './notes.service.js';
import { NotesRepository } from './notes.repository.js';
import { successResponse, errorResponse } from '../../utils/response.js';
import { z } from 'zod';

// ── Validation schema ─────────────────────────────────────────────────────────

// Zod v4 requires tuple literals for z.enum — plain arrays don't work
const CreateNoteSchema = z.object({
  type:        z.enum(['note', 'treatment', 'diagnosis', 'prescription', 'appointment', 'xray']).default('note'),
  title:       z.string().min(1, 'Title is required').max(255),
  description: z.string().min(1, 'Description is required'),
  doctor:      z.string().min(1, 'Doctor is required').max(255),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  status:      z.enum(['completed', 'active', 'scheduled', 'pending', 'cancelled', 'inactive']).default('completed'),
  cost:        z.number().nonnegative().nullable().optional(),
});

// ── Helper ────────────────────────────────────────────────────────────────────

function getService(request) {
  return new NotesService(new NotesRepository(request.server.db));
}

// ── Handlers ──────────────────────────────────────────────────────────────────

export async function listNotesHandler(request, reply) {
  const { patientId } = request.params;
  const service = getService(request);
  const notes = await service.listByPatient(patientId);
  return reply.status(200).send(successResponse(notes));
}

export async function createNoteHandler(request, reply) {
  const { patientId } = request.params;

  const parsed = CreateNoteSchema.safeParse(request.body);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => ({
      field:   i.path.join('.'),
      message: i.message,
    }));
    return reply.status(422).send(errorResponse('Validation failed', { fields }));
  }

  const service = getService(request);
  const createdBy = request.user?.sub ?? null;
  const note = await service.create(patientId, parsed.data, createdBy);
  return reply.status(201).send(successResponse(note));
}

export async function deleteNoteHandler(request, reply) {
  const { patientId, noteId } = request.params;
  const service = getService(request);
  await service.delete(patientId, noteId);
  return reply.status(204).send();
}
