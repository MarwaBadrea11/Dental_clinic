import { useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, FileText, Image, File, CheckCircle2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import type { Attachment } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function inferType(file: File): Attachment['type'] {
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf'))                          return 'pdf'
  if (/\.(dcm|dicom)$/.test(name))                   return 'xray'
  if (/\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/.test(name)) return 'image'
  return 'document'
}

function fileIcon(type: Attachment['type']) {
  if (type === 'pdf')      return <FileText size={18} className="text-[var(--color-error)]" />
  if (type === 'xray')     return <span style={{ fontSize: 18 }}>🩻</span>
  if (type === 'image')    return <Image size={18} className="text-[var(--color-tertiary)]" />
  return <File size={18} className="text-[var(--color-outline)]" />
}

function fileEmoji(type: Attachment['type']) {
  if (type === 'xray')  return '🩻'
  if (type === 'pdf')   return '📄'
  if (type === 'image') return '🖼'
  return '📎'
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface PendingFile {
  id: string
  file: File
  type: Attachment['type']
  preview?: string   // object URL for images
}

interface UploadFilesModalProps {
  open: boolean
  onClose: () => void
  onUpload: (attachments: Attachment[]) => void
  uploadedBy?: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function UploadFilesModal({ open, onClose, onUpload, uploadedBy = 'Dr. Smith' }: UploadFilesModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [pending, setPending] = useState<PendingFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)

  // ── File ingestion ─────────────────────────────────────────────────────────

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files)
    const next: PendingFile[] = arr.map((f) => {
      const type = inferType(f)
      return {
        id:      `pf-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file:    f,
        type,
        preview: type === 'image' ? URL.createObjectURL(f) : undefined,
      }
    })
    setPending((prev) => [...prev, ...next])
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files)
    e.target.value = ''   // reset so same file can be re-added
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  const remove = (id: string) => {
    setPending((prev) => {
      const item = prev.find((p) => p.id === id)
      if (item?.preview) URL.revokeObjectURL(item.preview)
      return prev.filter((p) => p.id !== id)
    })
  }

  // ── Upload simulation ──────────────────────────────────────────────────────

  const handleUpload = async () => {
    if (!pending.length) return
    setUploading(true)
    await new Promise((r) => setTimeout(r, 900))   // simulate network

    const today = new Date().toISOString().split('T')[0]
    const attachments: Attachment[] = pending.map((p) => ({
      id:         p.id,
      name:       p.file.name,
      type:       p.type,
      url:        p.preview ?? '',
      size:       formatBytes(p.file.size),
      uploadedAt: today,
      uploadedBy,
    }))

    onUpload(attachments)
    setUploading(false)
    setDone(true)
  }

  const handleClose = () => {
    // Revoke any object URLs
    pending.forEach((p) => { if (p.preview) URL.revokeObjectURL(p.preview) })
    setPending([])
    setUploading(false)
    setDone(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={done ? 'Upload Complete' : 'Upload Documents'}
      description={done ? undefined : 'Drag & drop files or click to browse. Supports images, PDFs and DICOM.'}
      size="lg"
    >
      {done ? (
        /* ── Success state ── */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 py-6 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-[var(--color-secondary-container)]/20 flex items-center justify-center">
            <CheckCircle2 size={36} className="text-[var(--color-secondary)]" />
          </div>
          <div>
            <p className="font-bold text-[var(--color-on-surface)] text-base">
              {pending.length === 0
                ? 'Files uploaded successfully'
                : `${pending.length} file${pending.length > 1 ? 's' : ''} uploaded`}
            </p>
            <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">
              The documents have been added to the patient's record.
            </p>
          </div>
          <Button onClick={handleClose} className="mt-2">Done</Button>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* ── Drop zone ── */}
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragging ? 'var(--color-primary)' : 'var(--color-outline-variant)'}`,
              borderRadius: 'var(--radius-lg)',
              background: dragging ? 'rgba(0,105,111,0.05)' : 'var(--color-surface-container-low)',
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'border-color 0.2s, background 0.2s',
            }}
          >
            <div style={{
              width: '3rem', height: '3rem', borderRadius: '50%',
              background: 'rgba(0,105,111,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 0.875rem',
              color: 'var(--color-primary)',
            }}>
              <Upload size={22} />
            </div>
            <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-on-surface)', marginBottom: '0.25rem' }}>
              Drop files here or click to browse
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
              PNG, JPG, PDF, DICOM — up to 50 MB each
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.dcm,.dicom"
            style={{ display: 'none' }}
            onChange={handleInputChange}
          />

          {/* ── Pending file list ── */}
          <AnimatePresence initial={false}>
            {pending.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  background: 'var(--color-surface-container-lowest)',
                  borderRadius: 'var(--radius-DEFAULT)',
                  border: '1px solid rgba(189,201,201,0.2)',
                }}
              >
                {/* Thumbnail or icon */}
                <div style={{
                  width: '2.5rem', height: '2.5rem', flexShrink: 0,
                  borderRadius: 'var(--radius-DEFAULT)',
                  background: 'var(--color-surface-container-low)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  {p.preview
                    ? <img src={p.preview} alt={p.file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : fileIcon(p.type)
                  }
                </div>

                {/* Name + size */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.file.name}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                    {formatBytes(p.file.size)} · {p.type.toUpperCase()}
                  </p>
                </div>

                {/* Remove */}
                <button
                  onClick={() => remove(p.id)}
                  style={{
                    width: '1.75rem', height: '1.75rem', borderRadius: '50%',
                    border: 'none', background: 'var(--color-surface-container-high)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--color-outline)', flexShrink: 0,
                  }}
                  aria-label="Remove file"
                >
                  <X size={13} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* ── Footer ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: '1rem',
            borderTop: '1px solid rgba(189,201,201,0.15)',
          }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
              {pending.length === 0
                ? 'No files selected'
                : `${pending.length} file${pending.length > 1 ? 's' : ''} ready to upload`}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button
                leftIcon={<Upload size={14} />}
                onClick={handleUpload}
                loading={uploading}
                disabled={pending.length === 0}
              >
                Upload {pending.length > 0 ? `(${pending.length})` : ''}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
