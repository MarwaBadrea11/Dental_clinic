import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Upload, X, Camera } from 'lucide-react'
import { Avatar } from './Avatar'
import { cn } from '@/utils/cn'

interface ImageUploadAreaProps {
  value?: string
  name?: string
  onChange?: (file: File | null) => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

const sizeMap = { sm: 'w-16 h-16', md: 'w-24 h-24', lg: 'w-32 h-32' }

export function ImageUploadArea({ value, name = 'User', onChange, className, size = 'md', label }: ImageUploadAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | undefined>(value)
  const [dragging, setDragging] = useState(false)

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file)
    setPreview(url)
    onChange?.(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) handleFile(file)
  }

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setPreview(undefined)
    onChange?.(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      {label && (
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)]">
          {label}
        </p>
      )}
      <div className="relative group">
        <motion.div
          whileHover={{ scale: 1.03 }}
          transition={{ duration: 0.15 }}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            sizeMap[size],
            'rounded-full cursor-pointer relative overflow-hidden',
            'border-2 border-dashed transition-colors duration-200',
            dragging
              ? 'border-[var(--color-primary)] bg-[var(--color-primary-container)]/10'
              : 'border-[var(--color-outline-variant)] hover:border-[var(--color-primary)]'
          )}
        >
          {preview ? (
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--color-surface-container-low)]">
              <Avatar name={name} size={size === 'lg' ? 'xl' : size === 'md' ? 'lg' : 'md'} className="border-0" />
            </div>
          )}
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera size={size === 'sm' ? 14 : 20} className="text-white" />
          </div>
        </motion.div>

        {/* Clear button */}
        {preview && (
          <button
            onClick={clear}
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--color-error)] text-white flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
            aria-label="Remove photo"
          >
            <X size={10} />
          </button>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />

      <p className="text-[11px] text-[var(--color-on-surface-variant)] text-center">
        Click or drag to upload photo
      </p>
    </div>
  )
}
