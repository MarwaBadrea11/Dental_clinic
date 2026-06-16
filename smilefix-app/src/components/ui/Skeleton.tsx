import { cn } from '@/utils/cn'

interface SkeletonProps {
  className?: string
  rounded?: boolean
  circle?: boolean
  style?: React.CSSProperties
}

export function Skeleton({ className, rounded = false, circle = false, style }: SkeletonProps) {
  return (
    <div
      style={style}
      className={cn(
        'animate-pulse bg-[var(--color-surface-container-high)]',
        circle ? 'rounded-full' : rounded ? 'rounded-[var(--radius-DEFAULT)]' : 'rounded',
        className
      )}
    />
  )
}

/** Pre-built card skeleton */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-lg)] border border-[var(--color-outline-variant)]/20 p-5 space-y-3', className)}>
      <div className="flex items-center gap-3">
        <Skeleton circle className="w-10 h-10" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-3/4" rounded />
          <Skeleton className="h-2.5 w-1/2" rounded />
        </div>
      </div>
      <Skeleton className="h-2.5 w-full" rounded />
      <Skeleton className="h-2.5 w-5/6" rounded />
      <Skeleton className="h-2.5 w-4/6" rounded />
    </div>
  )
}

/** Table row skeleton */
export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-3.5">
          <Skeleton className="h-4" rounded style={{ width: `${50 + Math.random() * 40}%` }} />
        </td>
      ))}
    </tr>
  )
}
