import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronUp, ChevronDown, ChevronsUpDown, MoreVertical } from 'lucide-react'
import { SearchBar } from './SearchBar'
import { Pagination } from './Pagination'
import { EmptyState } from './EmptyState'
import { Loader } from './Loader'
import { Dropdown } from './Dropdown'
import { cn } from '@/utils/cn'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DataTableColumn<T> {
  key: string
  header: string
  width?: string
  sortable?: boolean
  render?: (row: T) => React.ReactNode
}

export interface DataTableAction<T> {
  label: string
  icon?: React.ReactNode
  onClick: (row: T) => void
  danger?: boolean
  hidden?: (row: T) => boolean
}

interface DataTableProps<T extends { id: string }> {
  columns: DataTableColumn<T>[]
  data: T[]
  actions?: DataTableAction<T>[]
  loading?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  pageSize?: number
  emptyTitle?: string
  emptyDescription?: string
  emptyIcon?: React.ReactNode
  onRowClick?: (row: T) => void
  toolbar?: React.ReactNode
  className?: string
  /** External search value — if provided, disables internal search */
  externalSearch?: string
}

type SortDir = 'asc' | 'desc' | null

// ── Component ─────────────────────────────────────────────────────────────────

export function DataTable<T extends { id: string }>({
  columns, data, actions, loading = false,
  searchable = true, searchPlaceholder = 'Search...',
  pageSize = 10,
  emptyTitle = 'No records found',
  emptyDescription = 'Try adjusting your search or filters.',
  emptyIcon,
  onRowClick,
  toolbar,
  className,
  externalSearch,
}: DataTableProps<T>) {
  const [internalSearch, setInternalSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)
  const [page, setPage] = useState(1)

  const search = externalSearch !== undefined ? externalSearch : internalSearch

  // Filter
  const filtered = useMemo(() => {
    if (!search.trim()) return data
    const q = search.toLowerCase()
    return data.filter((row) =>
      Object.values(row as Record<string, unknown>).some((v) =>
        String(v ?? '').toLowerCase().includes(q)
      )
    )
  }, [data, search])

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered
    return [...filtered].sort((a, b) => {
      const av = String((a as Record<string, unknown>)[sortKey] ?? '')
      const bv = String((b as Record<string, unknown>)[sortKey] ?? '')
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
  }, [filtered, sortKey, sortDir])

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize)

  const handleSort = (key: string) => {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc') }
    else if (sortDir === 'asc') setSortDir('desc')
    else { setSortKey(null); setSortDir(null) }
    setPage(1)
  }

  const handleSearch = (v: string) => { setInternalSearch(v); setPage(1) }

  const SortIcon = ({ col }: { col: DataTableColumn<T> }) => {
    if (!col.sortable) return null
    if (sortKey !== col.key) return <ChevronsUpDown size={13} className="opacity-30" />
    if (sortDir === 'asc') return <ChevronUp size={13} className="text-[var(--color-primary)]" />
    return <ChevronDown size={13} className="text-[var(--color-primary)]" />
  }

  const hasActions = actions && actions.length > 0

  return (
    <div className={cn('flex flex-col gap-0', className)}>
      {/* ── Toolbar ── */}
      {(searchable || toolbar) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 border-b border-[var(--color-outline-variant)]/20">
          {searchable && externalSearch === undefined && (
            <SearchBar
              value={internalSearch}
              onChange={handleSearch}
              placeholder={searchPlaceholder}
              className="w-full sm:max-w-xs"
            />
          )}
          {toolbar && <div className="flex items-center gap-2 ml-auto">{toolbar}</div>}
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--color-surface-container-low)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={cn(
                    'px-5 py-3 text-[11px] font-semibold uppercase tracking-wider',
                    'text-[var(--color-on-surface-variant)]',
                    'border-b border-[var(--color-outline-variant)]/20',
                    col.sortable && 'cursor-pointer select-none hover:text-[var(--color-on-surface)] transition-colors'
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    {col.header}
                    <SortIcon col={col} />
                  </span>
                </th>
              ))}
              {hasActions && (
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)] border-b border-[var(--color-outline-variant)]/20 w-12" />
              )}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              // Skeleton rows
              Array.from({ length: pageSize > 5 ? 5 : pageSize }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-5 py-3.5">
                      <div className="h-4 bg-[var(--color-surface-container-high)] rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
                    </td>
                  ))}
                  {hasActions && <td className="px-5 py-3.5"><div className="h-4 w-4 bg-[var(--color-surface-container-high)] rounded animate-pulse" /></td>}
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (hasActions ? 1 : 0)}>
                  <EmptyState
                    icon={emptyIcon}
                    title={emptyTitle}
                    description={emptyDescription}
                  />
                </td>
              </tr>
            ) : (
              <AnimatePresence initial={false}>
                {paginated.map((row, i) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, delay: i * 0.03 }}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      'border-b border-[var(--color-outline-variant)]/10 last:border-0',
                      'transition-colors duration-150',
                      'hover:bg-[var(--color-surface-container-high)]',
                      onRowClick && 'cursor-pointer'
                    )}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="px-5 py-3.5 text-sm text-[var(--color-on-surface)]">
                        {col.render
                          ? col.render(row)
                          : String((row as Record<string, unknown>)[col.key] ?? '—')}
                      </td>
                    ))}
                    {hasActions && (
                      <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <Dropdown
                          trigger={
                            <button className="p-1.5 rounded-[var(--radius-DEFAULT)] text-[var(--color-outline)] hover:bg-[var(--color-surface-container-high)] hover:text-[var(--color-on-surface)] transition-colors">
                              <MoreVertical size={16} />
                            </button>
                          }
                          items={actions!
                            .filter((a) => !a.hidden?.(row))
                            .map((a) => ({
                              id: a.label,
                              label: a.label,
                              icon: a.icon,
                              danger: a.danger,
                              onClick: () => a.onClick(row),
                            }))}
                        />
                      </td>
                    )}
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer ── */}
      {!loading && sorted.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t border-[var(--color-outline-variant)]/20">
          <p className="text-xs text-[var(--color-on-surface-variant)]">
            Showing <span className="font-semibold text-[var(--color-on-surface)]">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)}</span> of{' '}
            <span className="font-semibold text-[var(--color-on-surface)]">{sorted.length}</span> records
          </p>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  )
}
