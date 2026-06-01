import { createWriteStream, mkdirSync, existsSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { NotFoundError } from '../../utils/errors.js';
import { env } from '../../config/env.js';

const UPLOADS_DIR = join(process.cwd(), env.UPLOAD_DIR);
mkdirSync(UPLOADS_DIR, { recursive: true });

// قائمة أنواع الملفات المسموحة
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff',
  'application/pdf', 'application/dicom', 'application/octet-stream',
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
      throw Object.assign(new Error(`File type '${mimetype}' is not allowed`), { statusCode: 400 });
    }

    const ext = extname(filename) || '';
    const storageKey = `${randomUUID()}${ext}`;
    const filePath = join(UPLOADS_DIR, storageKey);

    let bytesWritten = 0;
    const dest = createWriteStream(filePath);

    try {
      // استخدام stream مع مراقبة الحجم بدقة
      for await (const chunk of stream) {
        bytesWritten += chunk.length;
        if (bytesWritten > MAX_FILE_SIZE) {
          throw new Error('File exceeds the 50 MB limit');
        }
        dest.write(chunk);
      }
      dest.end();
    } catch (err) {
      await unlink(filePath).catch(() => {});
      throw Object.assign(new Error(err.message), { statusCode: 413 });
    }

    // محاولة الحفظ في قاعدة البيانات، إذا فشلت نحذف الملف الفيزيائي
    try {
      return await this.repo.create({
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
    } catch (dbErr) {
      await unlink(filePath).catch(() => {});
      throw new Error('Database operation failed: unable to link file');
    }
  }

  async delete(id) {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundError('Attachment not found');

    // حذف الملف فيزيائياً
    const filePath = join(UPLOADS_DIR, record.storage_key);
    if (existsSync(filePath)) {
        await unlink(filePath);
    }
    
    // تنفيذ الحذف المنطقي (Soft Delete)
    await this.repo.deleteById(id);
  }
}