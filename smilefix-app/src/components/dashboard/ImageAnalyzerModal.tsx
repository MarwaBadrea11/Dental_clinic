import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, FlaskConical, ScanLine, CheckCircle2, AlertTriangle, RotateCcw, ZoomIn } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Finding {
  severity: 'normal' | 'warning' | 'critical'
  region: string
  detail: string
}

type AnalysisPhase = 'idle' | 'uploading' | 'scanning' | 'done'

// ── Mock AI findings ──────────────────────────────────────────────────────────

const MOCK_FINDINGS: Finding[] = [
  { severity: 'critical', region: 'Tooth #36 (Lower Left Molar)',  detail: 'Periapical radiolucency detected — possible abscess or cyst. Endodontic evaluation recommended.' },
  { severity: 'warning',  region: 'Tooth #14 (Upper Left Premolar)', detail: 'Interproximal caries at mesial surface. Early-stage lesion, monitor or restore.' },
  { severity: 'warning',  region: 'Alveolar Bone (Lower Anterior)', detail: 'Mild horizontal bone loss pattern consistent with early periodontal disease.' },
  { severity: 'normal',   region: 'Remaining Dentition',           detail: 'No significant pathology detected. Restorations appear intact.' },
]

const SCAN_STEPS = [
  'Loading image data…',
  'Detecting tooth boundaries…',
  'Analysing bone density…',
  'Identifying radiolucencies…',
  'Cross-referencing patient history…',
  'Generating diagnostic report…',
]

// ── Severity helpers ──────────────────────────────────────────────────────────

const severityConfig = {
  critical: {
    icon: <AlertTriangle size={14} />,
    label: 'Critical',
    color: 'var(--color-error)',
    bg: 'var(--color-error-container)',
    border: 'var(--color-error)',
  },
  warning: {
    icon: <AlertTriangle size={14} />,
    label: 'Warning',
    color: 'var(--color-tertiary)',
    bg: 'rgba(44,100,132,0.08)',
    border: 'var(--color-tertiary)',
  },
  normal: {
    icon: <CheckCircle2 size={14} />,
    label: 'Normal',
    color: 'var(--color-secondary)',
    bg: 'rgba(53,103,93,0.08)',
    border: 'var(--color-secondary)',
  },
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ImageAnalyzerModalProps {
  open: boolean
  onClose: () => void
}

export function ImageAnalyzerModal({ open, onClose }: ImageAnalyzerModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [phase, setPhase] = useState<AnalysisPhase>('idle')
  const [scanStep, setScanStep] = useState(0)
  const [findings, setFindings] = useState<Finding[]>([])
  const [zoomIn, setZoomIn] = useState(false)

  // ── File handling ──────────────────────────────────────────────────────────

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    setFileName(file.name)
    const url = URL.createObjectURL(file)
    setPreview(url)
    runAnalysis()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  // ── Analysis simulation ────────────────────────────────────────────────────

  const runAnalysis = () => {
    setPhase('uploading')
    setFindings([])
    setScanStep(0)

    // Uploading → scanning after 800ms
    setTimeout(() => {
      setPhase('scanning')
      let step = 0
      const interval = setInterval(() => {
        step += 1
        setScanStep(step)
        if (step >= SCAN_STEPS.length - 1) {
          clearInterval(interval)
          setTimeout(() => {
            setFindings(MOCK_FINDINGS)
            setPhase('done')
          }, 500)
        }
      }, 420)
    }, 800)
  }

  const reset = () => {
    setPreview(null)
    setFileName(null)
    setPhase('idle')
    setScanStep(0)
    setFindings([])
    setZoomIn(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const criticalCount = findings.filter((f) => f.severity === 'critical').length
  const warningCount  = findings.filter((f) => f.severity === 'warning').length

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Precision X-Ray Analyzer"
      description="Upload a dental X-ray scan for AI-assisted diagnostic analysis."
      size="xl"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* ── Drop zone / preview ── */}
        <div
          onClick={() => phase === 'idle' && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); if (phase === 'idle') setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          style={{
            position: 'relative',
            width: '100%',
            height: preview ? 'auto' : '11rem',
            minHeight: preview ? '14rem' : '11rem',
            borderRadius: 'var(--radius-lg)',
            border: `2px dashed ${dragging ? 'var(--color-primary)' : preview ? 'var(--color-outline-variant)' : 'var(--color-outline-variant)'}`,
            background: dragging
              ? 'rgba(0,105,111,0.06)'
              : preview
              ? 'var(--color-surface-container)'
              : 'var(--color-surface-container-low)',
            cursor: phase === 'idle' ? 'pointer' : 'default',
            overflow: 'hidden',
            transition: 'border-color 0.2s, background 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {!preview ? (
            /* Empty state */
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{
                width: '3.5rem', height: '3.5rem', borderRadius: '50%',
                background: 'rgba(0,105,111,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem',
                color: 'var(--color-primary)',
              }}>
                <Upload size={24} />
              </div>
              <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-on-surface)', marginBottom: '0.25rem' }}>
                Drop X-ray scan here
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
                or click to browse — PNG, JPG, DICOM supported
              </p>
            </div>
          ) : (
            /* Image preview */
            <div style={{ width: '100%', position: 'relative' }}>
              <motion.img
                src={preview}
                alt="X-ray scan"
                animate={{ scale: zoomIn ? 1.6 : 1 }}
                transition={{ duration: 0.35 }}
                style={{
                  width: '100%',
                  maxHeight: '22rem',
                  objectFit: 'contain',
                  display: 'block',
                  filter: 'grayscale(0.3) contrast(1.1)',
                  background: '#0a0e10',
                }}
              />

              {/* Scanning overlay */}
              <AnimatePresence>
                {phase === 'scanning' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(0,105,111,0.18)',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                    }}
                  >
                    {/* Scan line */}
                    <motion.div
                      animate={{ top: ['10%', '90%', '10%'] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
                      style={{
                        position: 'absolute', left: 0, right: 0, height: 2,
                        background: 'linear-gradient(90deg, transparent, var(--color-primary), transparent)',
                        boxShadow: '0 0 12px var(--color-primary)',
                      }}
                    />
                    <div style={{
                      background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)',
                      borderRadius: 'var(--radius-DEFAULT)', padding: '0.75rem 1.25rem',
                      display: 'flex', alignItems: 'center', gap: '0.625rem',
                      color: 'var(--color-primary-fixed)',
                    }}>
                      <ScanLine size={16} className="animate-pulse" />
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                        {SCAN_STEPS[scanStep]}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Done overlay — AI badge */}
              <AnimatePresence>
                {phase === 'done' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                      position: 'absolute', top: '0.75rem', left: '0.75rem',
                      background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)',
                      borderRadius: 'var(--radius-full)', padding: '0.375rem 0.875rem',
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      color: 'var(--color-primary-fixed)',
                    }}
                  >
                    <FlaskConical size={13} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em' }}>AI ANALYSIS COMPLETE</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Zoom + Reset controls */}
              {phase === 'done' && (
                <div style={{
                  position: 'absolute', top: '0.75rem', right: '0.75rem',
                  display: 'flex', gap: '0.5rem',
                }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setZoomIn((v) => !v) }}
                    title={zoomIn ? 'Zoom out' : 'Zoom in'}
                    style={{
                      width: '2rem', height: '2rem', borderRadius: '50%',
                      background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white',
                    }}
                  >
                    <ZoomIn size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); reset() }}
                    title="Upload new scan"
                    style={{
                      width: '2rem', height: '2rem', borderRadius: '50%',
                      background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white',
                    }}
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*,.dcm"
          style={{ display: 'none' }}
          onChange={handleInputChange}
        />

        {/* ── Uploading progress bar ── */}
        <AnimatePresence>
          {phase === 'uploading' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ flex: 1, height: 6, background: 'var(--color-surface-container-high)', borderRadius: 9999, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 0.75, ease: 'easeInOut' }}
                    style={{ height: '100%', background: 'var(--color-primary)', borderRadius: 9999 }}
                  />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', whiteSpace: 'nowrap' }}>
                  Uploading…
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Findings ── */}
        <AnimatePresence>
          {phase === 'done' && findings.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Summary bar */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                marginBottom: '0.875rem', flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-on-surface)', flex: 1 }}>
                  Diagnostic Findings
                  {fileName && (
                    <span style={{ fontWeight: 400, color: 'var(--color-on-surface-variant)', marginLeft: '0.5rem' }}>
                      — {fileName}
                    </span>
                  )}
                </span>
                {criticalCount > 0 && (
                  <span style={{
                    fontSize: '0.6875rem', fontWeight: 700, padding: '0.2rem 0.625rem',
                    borderRadius: 9999, background: 'var(--color-error-container)',
                    color: 'var(--color-error)',
                  }}>
                    {criticalCount} Critical
                  </span>
                )}
                {warningCount > 0 && (
                  <span style={{
                    fontSize: '0.6875rem', fontWeight: 700, padding: '0.2rem 0.625rem',
                    borderRadius: 9999, background: 'rgba(44,100,132,0.12)',
                    color: 'var(--color-tertiary)',
                  }}>
                    {warningCount} Warning
                  </span>
                )}
              </div>

              {/* Finding cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {findings.map((f, i) => {
                  const cfg = severityConfig[f.severity]
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.22, delay: i * 0.07 }}
                      style={{
                        display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-DEFAULT)',
                        borderLeft: `3px solid ${cfg.border}`,
                        background: cfg.bg,
                      }}
                    >
                      <span style={{ color: cfg.color, marginTop: '0.1rem', flexShrink: 0 }}>
                        {cfg.icon}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
                            {f.region}
                          </span>
                          <span style={{
                            fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase',
                            letterSpacing: '0.06em', color: cfg.color,
                          }}>
                            {cfg.label}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
                          {f.detail}
                        </p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {/* Disclaimer */}
              <p style={{
                fontSize: '0.6875rem', color: 'var(--color-outline)',
                marginTop: '0.875rem', lineHeight: 1.5,
              }}>
                ⚠ AI-generated findings are for clinical decision support only. Always confirm with a qualified radiologist before treatment planning.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Footer actions ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.625rem',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(189,201,201,0.2)',
        }}>
          {phase === 'done' && (
            <Button variant="outline" size="sm" leftIcon={<RotateCcw size={13} />} onClick={reset}>
              New Scan
            </Button>
          )}
          {phase === 'idle' && (
            <Button variant="outline" size="sm" leftIcon={<Upload size={13} />} onClick={() => inputRef.current?.click()}>
              Browse Files
            </Button>
          )}
          <Button
            size="sm"
            variant={phase === 'done' ? 'primary' : 'ghost'}
            onClick={handleClose}
          >
            {phase === 'done' ? 'Save Report' : 'Close'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
