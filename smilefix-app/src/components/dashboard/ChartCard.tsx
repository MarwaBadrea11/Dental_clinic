import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend,
} from 'recharts'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useChartDimensions } from '@/hooks/useChartDimensions'

// ── Static chart data ────────────────────────────────────────────────────────
const TREATMENT_DATA = [
  { month: 'Jul', crowns: 28, rootCanals: 14 },
  { month: 'Aug', crowns: 35, rootCanals: 20 },
  { month: 'Sep', crowns: 22, rootCanals: 18 },
  { month: 'Oct', crowns: 40, rootCanals: 25 },
  { month: 'Nov', crowns: 31, rootCanals: 17 },
  { month: 'Dec', crowns: 38, rootCanals: 22 },
]

// ── Types ────────────────────────────────────────────────────────────────────
interface ChartCardProps {
  title: string
  description?: string
  action?: React.ReactNode
  children?: React.ReactNode
  /** Placeholder mode — shows a styled bar chart */
  placeholder?: boolean
  placeholderLabel?: string
  placeholderSublabel?: string
  onGenerate?: () => void
  delay?: number
  className?: string
}

// ── Custom tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)]/30 rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-[var(--color-on-surface)] mb-1">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color }} className="leading-5">
          {entry.name}: <span className="font-bold">{entry.value}</span>
        </p>
      ))}
    </div>
  )
}

// ── Component ────────────────────────────────────────────────────────────────
export function ChartCard({
  title, description, action, children,
  placeholder = false, onGenerate,
  delay = 0, className,
}: ChartCardProps) {
  const { containerRef, dimensions } = useChartDimensions()
  const { width, height } = dimensions

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={className}
    >
      <Card>
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-[var(--color-on-surface)]">{title}</h3>
            {description && (
              <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">{description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {action && <div>{action}</div>}
            {onGenerate && (
              <Button size="sm" variant="outline" onClick={onGenerate}>
                Generate Full View
              </Button>
            )}
          </div>
        </div>

        {/* ── Recharts bar chart (placeholder mode) ── */}
        {placeholder && (
          <div ref={containerRef} className="w-full" style={{ height: 300, minWidth: 0 }}>
            {width > 0 && height > 0 && (
              <BarChart
                width={width}
                height={height}
                data={TREATMENT_DATA}
                margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
                barCategoryGap="30%"
                barGap={4}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--color-outline-variant)"
                  strokeOpacity={0.25}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }}
                  axisLine={false}
                  tickLine={false}
                  dy={6}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: 'var(--color-outline-variant)', fillOpacity: 0.08 }}
                />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ paddingTop: 16, fontSize: 11, color: 'var(--color-on-surface-variant)' }}
                />
                <Bar dataKey="crowns"    name="Crown Placements" fill="#0D9488" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Bar dataKey="rootCanals" name="Root Canals"     fill="#6366F1" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            )}
          </div>
        )}

        {/* ── Custom children (non-placeholder usage) ── */}
        {children}
      </Card>
    </motion.div>
  )
}
