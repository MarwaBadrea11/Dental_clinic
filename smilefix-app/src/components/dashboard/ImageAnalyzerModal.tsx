import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Upload, X, FlaskConical, ScanLine, CheckCircle2, AlertTriangle, RotateCcw, ZoomIn, Download } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { exportElementToPdf, sanitizePdfFilename } from '@/utils/exportXrayReportPdf'
import { formatDate, localDateStr } from '@/utils/format'

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

const pdfSeverityStyles = {
  critical: { border: '#b3261e', bg: '#fce8e6', color: '#b3261e', label: 'Critical' },
  warning:  { border: '#2c6484', bg: '#e8f1f6', color: '#2c6484', label: 'Warning' },
  normal:   { border: '#35675d', bg: '#e8f3f0', color: '#35675d', label: 'Normal' },
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ImageAnalyzerModalProps {
  open: boolean
  onClose: () => void
  patientName?: string
  patientCode?: string
}

export function ImageAnalyzerModal({
  open,
  onClose,
  patientName,
  patientCode,
}: ImageAnalyzerModalProps) {
  const { t, i18n } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const reportExportRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [phase, setPhase] = useState<AnalysisPhase>('idle')
  const [scanStep, setScanStep] = useState(0)
  const [findings, setFindings] = useState<Finding[]>([])
  const [zoomIn, setZoomIn] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const resolvedPatientName = patientName?.trim() || t('xrayAnalyzer.generalPatient', { defaultValue: 'General Patient' })
  const reportDate = localDateStr()
  const generatedAt = new Date().toLocaleString(i18n.language)

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
    setIsExporting(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSaveReport = async () => {
    if (phase !== 'done' || !reportExportRef.current) return
    setIsExporting(true)
    try {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      })
      const safeName = sanitizePdfFilename(resolvedPatientName)
      await exportElementToPdf(
        reportExportRef.current,
        `XRay_Analysis_Report_${safeName}.pdf`,
      )
    } catch (err) {
      console.error('PDF export failed:', err)
    } finally {
      setIsExporting(false)
    }
  }

  const criticalCount = findings.filter((f) => f.severity === 'critical').length
  const warningCount  = findings.filter((f) => f.severity === 'warning').length

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t('xrayAnalyzer.title', { defaultValue: 'Precision X-Ray Analyzer' })}
      description={t('xrayAnalyzer.description', { defaultValue: 'Upload a dental X-ray scan for AI-assisted diagnostic analysis.' })}
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
                {t('xrayAnalyzer.dropHere', { defaultValue: 'Drop X-ray scan here' })}
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
                {t('xrayAnalyzer.browseHint', { defaultValue: 'or click to browse — PNG, JPG, DICOM supported' })}
              </p>
            </div>
          ) : (
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
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em' }}>
                      {t('xrayAnalyzer.aiComplete', { defaultValue: 'AI ANALYSIS COMPLETE' })}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

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
                  {t('xrayAnalyzer.uploading', { defaultValue: 'Uploading…' })}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase === 'done' && findings.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                marginBottom: '0.875rem', flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-on-surface)', flex: 1 }}>
                  {t('xrayAnalyzer.findingsTitle', { defaultValue: 'Diagnostic Findings' })}
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
                    {criticalCount} {t('xrayAnalyzer.critical', { defaultValue: 'Critical' })}
                  </span>
                )}
                {warningCount > 0 && (
                  <span style={{
                    fontSize: '0.6875rem', fontWeight: 700, padding: '0.2rem 0.625rem',
                    borderRadius: 9999, background: 'rgba(44,100,132,0.12)',
                    color: 'var(--color-tertiary)',
                  }}>
                    {warningCount} {t('xrayAnalyzer.warning', { defaultValue: 'Warning' })}
                  </span>
                )}
              </div>

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

              <p style={{
                fontSize: '0.6875rem', color: 'var(--color-outline)',
                marginTop: '0.875rem', lineHeight: 1.5,
              }}>
                {t('xrayAnalyzer.disclaimer', {
                  defaultValue: '⚠ AI-generated findings are for clinical decision support only. Always confirm with a qualified radiologist before treatment planning.',
                })}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Off-screen PDF export layout (canvas capture — preserves RTL Arabic) ── */}
        {phase === 'done' && (
          <div
            id="xray-report-export"
            ref={reportExportRef}
            dir={i18n.dir()}
            lang={i18n.language}
            aria-hidden="true"
            style={{
              position: 'fixed',
              left: '-10000px',
              top: 0,
              width: '794px',
              background: '#ffffff',
              color: '#1a1c1e',
              padding: '40px',
              fontFamily: 'system-ui, "Segoe UI", Tahoma, Arial, sans-serif',
              lineHeight: 1.5,
            }}
          >
            {/* Header */}
            <div style={{ borderBottom: '3px solid #00696f', paddingBottom: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#00696f' }}>
                    {t('xrayAnalyzer.reportTitle', { defaultValue: 'X-Ray AI Analysis Report' })}
                  </h1>
                  <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#5c6267' }}>
                    SmileFix Dental Clinic
                  </p>
                </div>
                <div style={{ textAlign: i18n.dir() === 'rtl' ? 'left' : 'right', fontSize: '12px', color: '#5c6267' }}>
                  <div>{t('common.date', { defaultValue: 'Date' })}: {formatDate(reportDate)}</div>
                  <div>{t('xrayAnalyzer.generatedAt', { defaultValue: 'Generated' })}: {generatedAt}</div>
                </div>
              </div>
            </div>

            {/* Patient metadata */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              background: '#f4f7f7',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px',
              fontSize: '13px',
            }}>
              <div>
                <strong>{t('common.patient', { defaultValue: 'Patient' })}:</strong>{' '}
                {resolvedPatientName}
              </div>
              {patientCode && (
                <div>
                  <strong>{t('patients.patientCode', { defaultValue: 'Patient Code' })}:</strong>{' '}
                  {patientCode}
                </div>
              )}
              <div>
                <strong>{t('xrayAnalyzer.scanFile', { defaultValue: 'Scan File' })}:</strong>{' '}
                {fileName ?? '—'}
              </div>
              <div>
                <strong>{t('xrayAnalyzer.analysisEngine', { defaultValue: 'Analysis Engine' })}:</strong>{' '}
                SmileFix AI v1.0
              </div>
            </div>

            {/* X-ray image */}
            {preview && (
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px', color: '#1a1c1e' }}>
                  {t('xrayAnalyzer.imagingStudy', { defaultValue: 'Radiographic Study' })}
                </h2>
                <div style={{ border: '1px solid #bdc9c9', borderRadius: '8px', overflow: 'hidden', background: '#0a0e10' }}>
                  <img
                    src={preview}
                    alt="X-ray"
                    crossOrigin="anonymous"
                    style={{ width: '100%', maxHeight: '360px', objectFit: 'contain', display: 'block' }}
                  />
                </div>
                <p style={{ fontSize: '11px', color: '#5c6267', marginTop: '8px' }}>
                  {t('xrayAnalyzer.bboxNote', {
                    defaultValue: 'AI region markers correspond to anatomical findings listed below.',
                  })}
                </p>
              </div>
            )}

            {/* Findings summary */}
            <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 700 }}>
                {t('xrayAnalyzer.findingsTitle', { defaultValue: 'Diagnostic Findings' })}:
              </span>
              {criticalCount > 0 && (
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: '#fce8e6', color: '#b3261e' }}>
                  {criticalCount} {t('xrayAnalyzer.critical', { defaultValue: 'Critical' })}
                </span>
              )}
              {warningCount > 0 && (
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: '#e8f1f6', color: '#2c6484' }}>
                  {warningCount} {t('xrayAnalyzer.warning', { defaultValue: 'Warning' })}
                </span>
              )}
            </div>

            {/* Finding cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {findings.map((f, i) => {
                const cfg = pdfSeverityStyles[f.severity]
                const cardBorder = i18n.dir() === 'rtl'
                  ? { borderRight: `3px solid ${cfg.border}` }
                  : { borderLeft: `3px solid ${cfg.border}` }
                return (
                  <div
                    key={i}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '6px',
                      background: cfg.bg,
                      ...cardBorder,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#1a1c1e' }}>{f.region}</span>
                      <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#44474a' }}>{f.detail}</p>
                  </div>
                )
              })}
            </div>

            {/* Footer disclaimer */}
            <div style={{ borderTop: '1px solid #bdc9c9', paddingTop: '14px', fontSize: '10px', color: '#747878', lineHeight: 1.6 }}>
              {t('xrayAnalyzer.disclaimer', {
                defaultValue: '⚠ AI-generated findings are for clinical decision support only. Always confirm with a qualified radiologist before treatment planning.',
              })}
            </div>
          </div>
        )}

        {/* ── Footer actions ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.625rem',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(189,201,201,0.2)',
        }}>
          {phase === 'done' && (
            <Button variant="outline" size="sm" leftIcon={<RotateCcw size={13} />} onClick={reset} disabled={isExporting}>
              {t('xrayAnalyzer.newScan', { defaultValue: 'New Scan' })}
            </Button>
          )}
          {phase === 'idle' && (
            <Button variant="outline" size="sm" leftIcon={<Upload size={13} />} onClick={() => inputRef.current?.click()}>
              {t('xrayAnalyzer.browseFiles', { defaultValue: 'Browse Files' })}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={handleClose} disabled={isExporting}>
            {t('common.close', { defaultValue: 'Close' })}
          </Button>
          {phase === 'done' && (
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Download size={13} />}
              loading={isExporting}
              onClick={() => void handleSaveReport()}
            >
              {isExporting
                ? t('xrayAnalyzer.generatingPdf', { defaultValue: 'Generating PDF…' })
                : t('xrayAnalyzer.saveReport', { defaultValue: 'Save Report' })}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
