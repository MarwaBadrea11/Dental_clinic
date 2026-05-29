import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  className?: string
}

const sizeMaxWidth: Record<string, string> = {
  sm:   '24rem',   // 384px
  md:   '28rem',   // 448px
  lg:   '32rem',   // 512px
  xl:   '42rem',   // 672px
  full: '64rem',   // 1024px
}

export function Modal({ open, onClose, title, description, children, size = 'md', className }: ModalProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-[var(--color-inverse-surface)]/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: '100%', maxWidth: sizeMaxWidth[size] }}
            className={cn(
              'relative z-10 bg-[var(--color-surface-container-lowest)]',
              'rounded-[var(--radius-xl)] shadow-[var(--shadow-modal)]',
              'border border-[var(--color-outline-variant)]/20',
              'my-auto',
              className
            )}
          >
            {/* Header */}
            {(title || description) && (
              <div className="flex items-start justify-between p-6 pb-4 border-b border-[var(--color-outline-variant)]/20">
                <div className="min-w-0 flex-1">
                  {title && (
                    <h2 className="text-lg font-semibold text-[var(--color-on-surface)]">{title}</h2>
                  )}
                  {description && (
                    <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">{description}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-[var(--radius-DEFAULT)] text-[var(--color-outline)] hover:bg-[var(--color-surface-container-high)] hover:text-[var(--color-on-surface)] transition-colors ml-4"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {/* Body */}
            <div className="p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
