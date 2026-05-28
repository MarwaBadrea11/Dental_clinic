import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Info, Save, RotateCcw } from 'lucide-react'
import { ToothDiagram } from './ToothDiagram'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { FormField } from '@/components/ui/FormField'
import { cn } from '@/utils/cn'
import type { OdontogramRecord, ToothCondition } from '@/types'

// ── Palmer Notation Layout ────────────────────────────────────────────────────
//
//  Screen layout (midline in centre):
//    Upper: [8 7 6 5 4 3 2 1 | 1 2 3 4 5 6 7 8]
//    Lower: [8 7 6 5 4 3 2 1 | 1 2 3 4 5 6 7 8]
//
//  FDI arrays — data keys stay as FDI; only the displayed label changes to Palmer.

// Upper Right: FDI 18→11, Palmer 8→1 (screen left → midline)
const UPPER_RIGHT: { fdi: number; palmer: number }[] = [
  { fdi: 18, palmer: 8 }, { fdi: 17, palmer: 7 }, { fdi: 16, palmer: 6 },
  { fdi: 15, palmer: 5 }, { fdi: 14, palmer: 4 }, { fdi: 13, palmer: 3 },
  { fdi: 12, palmer: 2 }, { fdi: 11, palmer: 1 },
]

// Upper Left: FDI 21→28, Palmer 1→8 (midline → screen right)
const UPPER_LEFT: { fdi: number; palmer: number }[] = [
  { fdi: 21, palmer: 1 }, { fdi: 22, palmer: 2 }, { fdi: 23, palmer: 3 },
  { fdi: 24, palmer: 4 }, { fdi: 25, palmer: 5 }, { fdi: 26, palmer: 6 },
  { fdi: 27, palmer: 7 }, { fdi: 28, palmer: 8 },
]

// Lower Right: FDI 48→41, Palmer 8→1 (screen left → midline)
const LOWER_RIGHT: { fdi: number; palmer: number }[] = [
  { fdi: 48, palmer: 8 }, { fdi: 47, palmer: 7 }, { fdi: 46, palmer: 6 },
  { fdi: 45, palmer: 5 }, { fdi: 44, palmer: 4 }, { fdi: 43, palmer: 3 },
  { fdi: 42, palmer: 2 }, { fdi: 41, palmer: 1 },
]

// Lower Left: FDI 31→38, Palmer 1→8 (midline → screen right)
const LOWER_LEFT: { fdi: number; palmer: number }[] = [
  { fdi: 31, palmer: 1 }, { fdi: 32, palmer: 2 }, { fdi: 33, palmer: 3 },
  { fdi: 34, palmer: 4 }, { fdi: 35, palmer: 5 }, { fdi: 36, palmer: 6 },
  { fdi: 37, palmer: 7 }, { fdi: 38, palmer: 8 },
]

// ── Condition options ─────────────────────────────────────────────────────────
const CONDITION_OPTIONS: { value: ToothCondition; label: string }[] = [
  { value: 'healthy',     label: '✓ Healthy'     },
  { value: 'caries',      label: '● Caries'      },
  { value: 'filled',      label: '■ Filled'      },
  { value: 'crown',       label: '♛ Crown'       },
  { value: 'root-canal',  label: '| Root Canal'  },
  { value: 'missing',     label: '✕ Missing'     },
  { value: 'extraction',  label: '✕ Extracted'   },
  { value: 'implant',     label: '⊕ Implant'     },
  { value: 'bridge',      label: '⌒ Bridge'      },
  { value: 'fracture',    label: '⚡ Fracture'    },
]

// ── Legend ────────────────────────────────────────────────────────────────────
const LEGEND: { condition: ToothCondition; label: string; color: string }[] = [
  { condition: 'healthy',    label: 'Healthy',  color: '#ffffff' },
  { condition: 'caries',     label: 'Caries',   color: '#ffdad6' },
  { condition: 'filled',     label: 'Filled',   color: '#b6eadd' },
  { condition: 'crown',      label: 'Crown',    color: '#c7e7ff' },
  { condition: 'root-canal', label: 'RCT',      color: '#fde8d8' },
  { condition: 'missing',    label: 'Missing',  color: '#e5e9ec' },
  { condition: 'implant',    label: 'Implant',  color: '#e8d5ff' },
]

// ── Props ─────────────────────────────────────────────────────────────────────
interface OdontogramChartProps {
  record: OdontogramRecord
  editable?: boolean
  onUpdate?: (toothNumber: number, condition: ToothCondition, notes?: string) => void
  className?: string
}

// ── Quadrant row ──────────────────────────────────────────────────────────────
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

// ── Main chart ────────────────────────────────────────────────────────────────
export function OdontogramChart({ record, editable = false, onUpdate, className }: OdontogramChartProps) {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null)
  const [editCondition, setEditCondition] = useState<ToothCondition>('healthy')
  const [editNotes, setEditNotes] = useState('')

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

  // Human-readable label for the edit panel
  const selectedPalmer = selectedTooth !== null
    ? ([...UPPER_RIGHT, ...UPPER_LEFT, ...LOWER_RIGHT, ...LOWER_LEFT]
        .find((t) => t.fdi === selectedTooth)?.palmer ?? selectedTooth)
    : null

  const selectedQuadrant = selectedTooth !== null
    ? UPPER_RIGHT.some((t) => t.fdi === selectedTooth) ? 'Upper Right'
    : UPPER_LEFT.some((t)  => t.fdi === selectedTooth) ? 'Upper Left'
    : LOWER_LEFT.some((t)  => t.fdi === selectedTooth) ? 'Lower Left'
    : 'Lower Right'
    : ''

  return (
    <div className={cn('space-y-4', className)}>

      {/* ── Chart ── */}
      <div className="bg-[var(--color-surface-container-low)] rounded-[var(--radius-lg)] p-6 overflow-x-auto">
        <div className="min-w-[600px] space-y-2">

          {/* Upper jaw */}
          <div className="space-y-1">
            {/* Quadrant direction labels */}
            <div className="flex justify-between px-1 mb-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]/50">
                ← RIGHT (UPPER)
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]/50">
                LEFT (UPPER) →
              </span>
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-on-surface-variant)] text-center mb-2">
              Upper Jaw
            </p>

            <div className="flex justify-center gap-4">
              {renderQuadrant(UPPER_RIGHT, true, selectedTooth, getCondition, editable ? handleToothClick : undefined)}
              <div className="w-px bg-[var(--color-outline-variant)]/40 self-stretch mx-1" />
              {renderQuadrant(UPPER_LEFT,  true, selectedTooth, getCondition, editable ? handleToothClick : undefined)}
            </div>
          </div>

          {/* Midline */}
          <div className="flex items-center gap-2 py-1">
            <div className="flex-1 h-px bg-[var(--color-outline-variant)]/30" />
            <span className="text-[10px] text-[var(--color-outline)] font-medium px-2">MIDLINE</span>
            <div className="flex-1 h-px bg-[var(--color-outline-variant)]/30" />
          </div>

          {/* Lower jaw */}
          <div className="space-y-1">
            <div className="flex justify-center gap-4">
              {renderQuadrant(LOWER_RIGHT, false, selectedTooth, getCondition, editable ? handleToothClick : undefined)}
              <div className="w-px bg-[var(--color-outline-variant)]/40 self-stretch mx-1" />
              {renderQuadrant(LOWER_LEFT,  false, selectedTooth, getCondition, editable ? handleToothClick : undefined)}
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-on-surface-variant)] text-center mt-2">
              Lower Jaw
            </p>

            {/* Quadrant direction labels */}
            <div className="flex justify-between px-1 mt-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]/50">
                ← RIGHT (LOWER)
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]/50">
                LEFT (LOWER) →
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap gap-2">
        {LEGEND.map((l) => (
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
        {editable && selectedTooth !== null && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-lg)] border border-[var(--color-primary)]/30 shadow-[var(--shadow-card)] p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-xs font-bold">
                  {selectedPalmer}
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-[var(--color-on-surface)] leading-tight">
                    Tooth {selectedPalmer} — {selectedQuadrant}
                  </h4>
                  <p className="text-[10px] text-[var(--color-on-surface-variant)]">
                    FDI #{selectedTooth} · Palmer Notation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTooth(null)}
                className="text-xs text-[var(--color-outline)] hover:text-[var(--color-on-surface)] transition-colors"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Condition">
                <Select
                  options={CONDITION_OPTIONS}
                  value={editCondition}
                  onChange={(e) => setEditCondition(e.target.value as ToothCondition)}
                />
              </FormField>
              <FormField label="Notes">
                <Textarea
                  placeholder="Clinical notes for this tooth..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                />
              </FormField>
            </div>

            <div className="flex items-center justify-end gap-2 mt-4">
              <Button variant="ghost" size="sm" leftIcon={<RotateCcw size={13} />} onClick={() => setSelectedTooth(null)}>
                Cancel
              </Button>
              <Button size="sm" leftIcon={<Save size={13} />} onClick={handleSave}>
                Save Tooth
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Meta ── */}
      <div className="flex items-center gap-2 text-[11px] text-[var(--color-on-surface-variant)]">
        <Info size={12} />
        <span>Palmer Notation — click any tooth to update condition</span>
        <span className="opacity-40">·</span>
        <span>Last updated: {record.updatedAt} · {record.doctor}</span>
      </div>
    </div>
  )
}
