import { createWriteStream, mkdirSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { NotFoundError } from '../../utils/errors.js';
import { env } from '../../config/env.js';

// Ensure uploads directory exists at startup
const UPLOADS_DIR = join(process.cwd(), env.UPLOAD_DIR);
mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff',
  'application/pdf',
  'application/dicom', 'application/octet-stream',
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

function inferImageType(mimeType, fileName) {
  if (mimeType === 'application/pdf') return 'DOCUMENT';
  if (/\.(dcm|dicom)$/i.test(fileName) || mimeType === 'application/dicom') return 'XRAY';
  if (mimeType.startsWith('image/')) return 'PHOTO';
  return 'DOCUMENT';
}

export class AttachmentsService {
  /** @param {import('./attachments.repository.js').AttachmentsRepository} repo */
  constructor(repo) {
    this.repo = repo;
  }

  async listByPatient(patientId) {
    return this.repo.findByPatientId(patientId);
  }

  async upload({ patientId, uploadedBy, file, treatmentPlanId, appointmentId, toothNumber, notes }) {
    const { filename, mimetype, file: stream } = file;

    if (!ALLOWED_MIME_TYPES.has(mimetype)) {
      const err = new Error(`File type '${mimetype}' is not allowed`);
      err.statusCode = 400;
      throw err;
    }

    const ext = extname(filename) || '';
    const storageKey = `${randomUUID()}${ext}`;
    const filePath = join(UPLOADS_DIR, storageKey);

    let bytesWritten = 0;
    const dest = createWriteStream(filePath);

    // Track size while streaming
    stream.on('data', (chunk) => {
      bytesWritten += chunk.length;
      if (bytesWritten > MAX_FILE_SIZE) {
        stream.destroy(new Error('File too large'));
      }
    });

    try {
      await pipeline(stream, dest);
    } catch (err) {
      // Clean up partial file
      await unlink(filePath).catch(() => {});
      const sizeErr = new Error('File exceeds the 50 MB limit');
      sizeErr.statusCode = 413;
      throw sizeErr;
    }

    const record = await this.repo.create({
      patient_id:        patientId,
      treatment_plan_id: treatmentPlanId ?? null,
      appointment_id:    appointmentId ?? null,
      tooth_number:      toothNumber ?? null,
      type:              inferImageType(mimetype, filename),
      file_name:         filename,
      storage_key:       storageKey,
      mime_type:         mimetype,
      file_size_bytes:   bytesWritten,
      uploaded_by:       uploadedBy ?? null,
      notes:             notes ?? null,
    });

    return record;
  }

  async delete(id) {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundError('Attachment not found');

    const filePath = join(UPLOADS_DIR, record.storage_key);
    await unlink(filePath).catch(() => {}); // best-effort file removal
    await this.repo.deleteById(id);
  }
}
