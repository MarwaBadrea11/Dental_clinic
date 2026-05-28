import { motion } from 'framer-motion'
import { Download, ExternalLink } from 'lucide-react'
import { cn } from '@/utils/cn'

interface ReportCardProps {
  title: string
  description: string
  icon: React.ReactNode
  category: string
  lastGenerated?: string
  onGenerate?: () => void
  onDownload?: () => void
  delay?: number
  className?: string
}

export function ReportCard({
  title, description, icon, category, lastGenerated,
  onGenerate, onDownload, delay = 0, className,
}: ReportCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay }}
      whileHover={{ y: -2, boxShadow: 'var(--shadow-card-hover)' }}
      className={cn(
        'bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-lg)]',
        'border border-[var(--color-outline-variant)]/20 shadow-[var(--shadow-card)]',
        'p-5 flex flex-col gap-3 transition-all duration-200',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-primary-container)]/20 flex items-center justify-center text-[var(--color-primary)] shrink-0">
          {icon}
        </div>
        <span className="px-2 py-0.5 bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] text-[10px] font-semibold rounded-full">
          {category}
        </span>
      </div>
      <div>
        <h3 className="font-semibold text-sm text-[var(--color-on-surface)]">{title}</h3>
        <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5 leading-relaxed">{description}</p>
      </div>
      {lastGenerated && (
        <p className="text-[10px] text-[var(--color-outline)]">Last generated: {lastGenerated}</p>
      )}
      <div className="flex items-center gap-2 mt-auto pt-2 border-t border-[var(--color-outline-variant)]/15">
        {onGenerate && (
          <button
            onClick={onGenerate}
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)] hover:underline"
          >
            <ExternalLink size={12} /> Generate
          </button>
        )}
        {onDownload && (
          <button
            onClick={onDownload}
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] ml-auto"
          >
            <Download size={12} /> Download
          </button>
        )}
      </div>
    </motion.div>
  )
}
