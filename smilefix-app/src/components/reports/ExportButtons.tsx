import { Download, FileText, Table2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

interface ExportButtonsProps {
  onExportPDF?: () => void
  onExportCSV?: () => void
  onExportExcel?: () => void
  className?: string
  size?: 'sm' | 'md'
}

export function ExportButtons({ onExportPDF, onExportCSV, onExportExcel, className, size = 'sm' }: ExportButtonsProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {onExportPDF && (
        <Button variant="outline" size={size} leftIcon={<FileText size={13} />} onClick={onExportPDF}>
          PDF
        </Button>
      )}
      {onExportCSV && (
        <Button variant="outline" size={size} leftIcon={<Download size={13} />} onClick={onExportCSV}>
          CSV
        </Button>
      )}
      {onExportExcel && (
        <Button variant="secondary" size={size} leftIcon={<Table2 size={13} />} onClick={onExportExcel}>
          Excel
        </Button>
      )}
    </div>
  )
}
