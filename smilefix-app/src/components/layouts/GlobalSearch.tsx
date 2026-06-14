import { useCallback, useEffect, useRef, useState } from 'react'
import { Phone, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { ExpandableSearch } from '@/components/ui/ExpandableSearch'
import { Loader } from '@/components/ui/Loader'
import { useDebounce } from '@/hooks/useDebounce'
import { usePatientSearch } from '@/hooks/usePatientSearch'
import { cn } from '@/utils/cn'
import type { Patient } from '@/types'

const DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 2

export function GlobalSearch() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const debouncedQuery = useDebounce(query.trim(), DEBOUNCE_MS)
  const showDropdown = open && query.trim().length >= MIN_QUERY_LENGTH

  const { data: results = [], isFetching } = usePatientSearch(debouncedQuery, {
    enabled: showDropdown,
  })

  const isPendingDebounce =
    showDropdown && debouncedQuery !== query.trim()
  const isLoading = isPendingDebounce || isFetching
  const showEmpty = showDropdown && !isLoading && results.length === 0

  const closeDropdown = useCallback(() => setOpen(false), [])

  const handleSelect = useCallback(
    (patient: Patient) => {
      setQuery('')
      closeDropdown()
      navigate(`/patients/${patient.id}`)
    },
    [closeDropdown, navigate],
  )

  // Close on click outside
  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        closeDropdown()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open, closeDropdown])

  // Close on Escape
  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeDropdown()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, closeDropdown])

  return (
    <div ref={containerRef} className="relative">
      <ExpandableSearch
        value={query}
        onChange={(value) => {
          setQuery(value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder={t('topbar.search')}
        ariaLabel={t('topbar.search')}
        clearAriaLabel={t('topbar.clearSearch')}
        expandedWidth={260}
      />

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            role="listbox"
            aria-label={t('topbar.searchResults')}
            className={cn(
              'absolute top-[calc(100%+0.5rem)] end-0 z-50',
              'w-[min(calc(100vw-1.5rem),20rem)]',
              'rounded-[var(--radius-lg)] overflow-hidden',
              'bg-[var(--color-surface-container-lowest)]',
              'border border-[var(--color-outline-variant)]/30',
              'shadow-[var(--shadow-card-hover)]',
            )}
          >
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader size="sm" label={t('topbar.searching')} className="p-0" />
              </div>
            )}

            {showEmpty && (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <User size={22} className="text-[var(--color-outline)]" />
                <p className="text-sm text-[var(--color-on-surface-variant)]">
                  {t('topbar.noResults')}
                </p>
              </div>
            )}

            {!isLoading && results.length > 0 && (
              <ul className="max-h-72 overflow-y-auto py-1">
                {results.map((patient) => {
                  const fullName = `${patient.firstName} ${patient.lastName}`.trim()

                  return (
                    <li key={patient.id}>
                      <button
                        type="button"
                        role="option"
                        onClick={() => handleSelect(patient)}
                        className={cn(
                          'w-full px-3 py-2.5 text-start',
                          'flex flex-col gap-0.5',
                          'hover:bg-[var(--color-primary-container)]/15',
                          'focus-visible:outline-none focus-visible:bg-[var(--color-primary-container)]/20',
                          'transition-colors',
                        )}
                      >
                        <span className="text-sm font-semibold text-[var(--color-on-surface)] truncate">
                          {fullName}
                        </span>
                        <span className="text-xs text-[var(--color-primary)] font-medium">
                          {patient.patientCode}
                        </span>
                        {patient.phone && (
                          <span className="flex items-center gap-1.5 text-xs text-[var(--color-on-surface-variant)]">
                            <Phone size={11} className="shrink-0 text-[var(--color-outline)]" />
                            <span dir="ltr" className="truncate">{patient.phone}</span>
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
