import { useTranslation } from 'react-i18next'
import { AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'
import { cn } from '@/utils/cn'

interface ExpiryIndicatorProps {
  expiryDate?: string
  className?: string
  showLabel?: boolean
}

function getDaysUntilExpiry(dateStr: string): number {
  const expiry = new Date(dateStr)
  const now = new Date()
  return Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function ExpiryIndicator({ expiryDate, className, showLabel = true }: ExpiryIndicatorProps) {
  const { t } = useTranslation()

  if (!expiryDate) {
    return showLabel ? (
      <span className="text-xs text-[var(--color-on-surface-variant)]">{t('inventory.noExpiry')}</span>
    ) : null
  }

  const days = getDaysUntilExpiry(expiryDate)
  const expired  = days < 0
  const critical = days >= 0 && days <= 30
  const warning  = days > 30 && days <= 90

  const config = expired
    ? { icon: <AlertTriangle size={12} />, text: t('inventory.expired'),                    classes: 'text-[var(--color-on-surface-variant)] bg-[var(--color-surface-container-high)]' }
    : critical
    ? { icon: <AlertTriangle size={12} />, text: `${days}${t('inventory.daysLeft')}`,       classes: 'text-[var(--color-error)] bg-[var(--color-error-container)]' }
    : warning
    ? { icon: <Clock size={12} />,         text: `${days}${t('inventory.daysLeft')}`,       classes: 'text-amber-700 bg-amber-100' }
    : { icon: <CheckCircle2 size={12} />,  text: `${days}${t('inventory.daysLeft')}`,       classes: 'text-[var(--color-secondary)] bg-[var(--color-secondary-container)]/20' }

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold',
      config.classes,
      className
    )}>
      {config.icon}
      {showLabel && config.text}
    </span>
  )
}
