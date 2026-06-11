import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Info, Save, RotateCcw } from 'lucide-react'
import { ToothDiagram } from './ToothDiagram'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { FormField } from '@/components/ui/FormField'
import { cn } from '@/utils/cn'
import { useUIStore } from '@/store/uiStore'
import {
  buildToothConditionSelectOptions,
  buildToothLegendItems,
  getQuadrantLabel,
  type OdontogramQuadrant,
} from '@/i18n/patientOdontogramOptions'
import type { OdontogramRecord, ToothCondition } from '@/types'

// ── Palmer Notation Layout ────────────────────────────────────────────────────

const UPPER_RIGHT: { fdi: number; palmer: number }[] = [
  { fdi: 18, palmer: 8 }, { fdi: 17, palmer: 7 }, { fdi: 16, palmer: 6 },
  { fdi: 15, palmer: 5 }, { fdi: 14, palmer: 4 }, { fdi: 13, palmer: 3 },
  { fdi: 12, palmer: 2 }, { fdi: 11, palmer: 1 },
]

const UPPER_LEFT: { fdi: number; palmer: number }[] = [
  { fdi: 21, palmer: 1 }, { fdi: 22, palmer: 2 }, { fdi: 23, palmer: 3 },
  { fdi: 24, palmer: 4 }, { fdi: 25, palmer: 5 }, { fdi: 26, palmer: 6 },
  { fdi: 27, palmer: 7 }, { fdi: 28, palmer: 8 },
]

const LOWER_RIGHT: { fdi: number; palmer: number }[] = [
  { fdi: 48, palmer: 8 }, { fdi: 47, palmer: 7 }, { fdi: 46, palmer: 6 },
  { fdi: 45, palmer: 5 }, { fdi: 44, palmer: 4 }, { fdi: 43, palmer: 3 },
  { fdi: 42, palmer: 2 }, { fdi: 41, palmer: 1 },
]

const LOWER_LEFT: { fdi: number; palmer: number }[] = [
  { fdi: 31, palmer: 1 }, { fdi: 32, palmer: 2 }, { fdi: 33, palmer: 3 },
  { fdi: 34, palmer: 4 }, { fdi: 35, palmer: 5 }, { fdi: 36, palmer: 6 },
  { fdi: 37, palmer: 7 }, { fdi: 38, palmer: 8 },
]

function resolveQuadrant(fdi: number): OdontogramQuadrant {
  if (UPPER_RIGHT.some((t) => t.fdi === fdi)) return 'upperRight'
  if (UPPER_LEFT.some((t) => t.fdi === fdi)) return 'upperLeft'
  if (LOWER_LEFT.some((t) => t.fdi === fdi)) return 'lowerLeft'
  return 'lowerRight'
}

function resolvePalmer(fdi: number): number {
  return [...UPPER_RIGHT, ...UPPER_LEFT, ...LOWER_RIGHT, ...LOWER_LEFT]
    .find((t) => t.fdi === fdi)?.palmer ?? fdi
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface OdontogramChartProps {
  record: OdontogramRecord
  editable?: boolean
  onUpdate?: (toothNumber: number, condition: ToothCondition, notes?: string) => void
  className?: string
}

function renderQuadrant(
  teeth: { fdi: number; palmer: number }[],
  isUpper: boolean,
  selectedTooth: number | null,
  getCondition: (n: number) => ToothCondition,
  onToothClick?: (n: number) => void,
) {
  return (
    <div className="flex items-end">
      {teeth.map(({ fdi, palmer }) => (
        <ToothDiagram
          key={fdi}
          toothNumber={fdi}
          displayNumber={palmer}
          condition={getCondition(fdi)}
          isSelected={selectedTooth === fdi}
          isUpper={isUpper}
          onClick={onToothClick}
          size="md"
        />
      ))}
    </div>
  )
}

export function OdontogramChart({ record, editable = false, onUpdate, className }: OdontogramChartProps) {
  const { t } = useTranslation()
  const { language } = useUIStore()
  const isRTL = language === 'ar'

  const [selectedTooth, setSelectedTooth] = useState<number | null>(null)
  const [editCondition, setEditCondition] = useState<ToothCondition>('healthy')
  const [editNotes, setEditNotes] = useState('')

  const conditionOptions = buildToothConditionSelectOptions(t)
  const legendItems = buildToothLegendItems(t)

  const getCondition = (n: number): ToothCondition =>
    record.teeth[n]?.condition ?? 'healthy'

  const handleToothClick = (n: number) => {
    if (!editable) return
    setSelectedTooth(n)
    setEditCondition(record.teeth[n]?.condition ?? 'healthy')
    setEditNotes(record.teeth[n]?.notes ?? '')
  }

  const handleSave = () => {
    if (selectedTooth === null) return
    onUpdate?.(selectedTooth, editCondition, editNotes)
    setSelectedTooth(null)
  }

  const selectedPalmer = selectedTooth !== null ? resolvePalmer(selectedTooth) : null
  const selectedQuadrant = selectedTooth !== null ? resolveQuadrant(selectedTooth) : null

  return (
    <div className={cn('space-y-4', className)} dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ── Chart ── */}
      <div className="bg-[var(--color-surface-container-low)] rounded-[var(--radius-lg)] p-6 overflow-x-auto">
        <div className="min-w-[600px] space-y-2">

          {/* Upper jaw (maxillary) */}
          <div className="space-y-1">
            <div className={cn('flex justify-between px-1 mb-1', isRTL && 'flex-row-reverse')}>
              <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]/50 text-start">
                {t('odontogram.quadrantLabelUpperRight')}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]/50 text-end">
                {t('odontogram.quadrantLabelUpperLeft')}
              </span>
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-on-surface-variant)] text-center mb-2">
              {t('odontogram.maxillary')}
            </p>

            <div className={cn('flex justify-center gap-4', isRTL && 'flex-row-reverse')}>
              {renderQuadrant(UPPER_RIGHT, true, selectedTooth, getCondition, editable ? handleToothClick : undefined)}
              <div className="w-px bg-[var(--color-outline-variant)]/40 self-stretch mx-1" />
              {renderQuadrant(UPPER_LEFT, true, selectedTooth, getCondition, editable ? handleToothClick : undefined)}
            </div>
          </div>

          {/* Midline */}
          <div className="flex items-center gap-2 py-1">
            <div className="flex-1 h-px bg-[var(--color-outline-variant)]/30" />
            <span className="text-[10px] text-[var(--color-outline)] font-medium px-2">{t('odontogram.midline')}</span>
            <div className="flex-1 h-px bg-[var(--color-outline-variant)]/30" />
          </div>

          {/* Lower jaw (mandibular) */}
          <div className="space-y-1">
            <div className={cn('flex justify-center gap-4', isRTL && 'flex-row-reverse')}>
              {renderQuadrant(LOWER_RIGHT, false, selectedTooth, getCondition, editable ? handleToothClick : undefined)}
              <div className="w-px bg-[var(--color-outline-variant)]/40 self-stretch mx-1" />
              {renderQuadrant(LOWER_LEFT, false, selectedTooth, getCondition, editable ? handleToothClick : undefined)}
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-on-surface-variant)] text-center mt-2">
              {t('odontogram.mandibular')}
            </p>

            <div className={cn('flex justify-between px-1 mt-1', isRTL && 'flex-row-reverse')}>
              <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]/50 text-start">
                {t('odontogram.quadrantLabelLowerRight')}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]/50 text-end">
                {t('odontogram.quadrantLabelLowerLeft')}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* ── Legend ── */}
      <div className={cn('flex flex-wrap gap-2', isRTL && 'flex-row-reverse justify-end')}>
        {legendItems.map((l) => (
          <div key={l.condition} className="flex items-center gap-1.5">
            <div
              className="w-4 h-4 rounded border border-[var(--color-outline-variant)]/40"
              style={{ background: l.color }}
            />
            <span className="text-[11px] text-[var(--color-on-surface-variant)]">{l.label}</span>
          </div>
        ))}
      </div>

      {/* ── Edit panel ── */}
      <AnimatePresence>
        {editable && selectedTooth !== null && selectedPalmer !== null && selectedQuadrant !== null && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-lg)] border border-[var(--color-primary)]/30 shadow-[var(--shadow-card)] p-5"
          >
            <div className={cn('flex items-center justify-between mb-4 gap-3', isRTL && 'flex-row-reverse')}>
              <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
                <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-xs font-bold">
                  {selectedPalmer}
                </div>
                <div className={isRTL ? 'text-end' : 'text-start'}>
                  <h4 className="font-semibold text-sm text-[var(--color-on-surface)] leading-tight">
                    {t('odontogram.toothTitle', {
                      number: selectedPalmer,
                      quadrant: getQuadrantLabel(t, selectedQuadrant),
                    })}
                  </h4>
                  <p className="text-[10px] text-[var(--color-on-surface-variant)]">
                    {t('odontogram.fdiPalmer', { fdi: selectedTooth })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTooth(null)}
                className="text-xs text-[var(--color-outline)] hover:text-[var(--color-on-surface)] transition-colors shrink-0"
              >
                ✕ {t('common.close')}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label={t('odontogram.condition')}>
                <Select
                  options={conditionOptions}
                  value={editCondition}
                  onChange={(e) => setEditCondition(e.target.value as ToothCondition)}
                />
              </FormField>
              <FormField label={t('common.notes')}>
                <Textarea
                  placeholder={t('odontogram.notes')}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                />
              </FormField>
            </div>

            <div className={cn('flex items-center justify-end gap-2 mt-4', isRTL && 'flex-row-reverse')}>
              <Button variant="ghost" size="sm" leftIcon={<RotateCcw size={13} />} onClick={() => setSelectedTooth(null)}>
                {t('common.cancel')}
              </Button>
              <Button size="sm" leftIcon={<Save size={13} />} onClick={handleSave}>
                {t('odontogram.saveTooth')}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Meta ── */}
      <div className={cn('flex items-center gap-2 text-[11px] text-[var(--color-on-surface-variant)] flex-wrap', isRTL && 'flex-row-reverse')}>
        <Info size={12} />
        <span>{t('odontogram.clickToEdit')}</span>
        <span className="opacity-40">·</span>
        <span>{t('odontogram.lastUpdatedMeta', { date: record.updatedAt, doctor: record.doctor })}</span>
      </div>
    </div>
  )
}
