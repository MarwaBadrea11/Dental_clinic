import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  BarChart as RechartsBarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts'
import { SectionCard } from '@/components/ui/SectionCard'
import { useChartDimensions } from '@/hooks/useChartDimensions'

// ── Bar Chart (Recharts) ──────────────────────────────────────────────────────

interface BarData { label: string; value: number; color?: string }

interface BarChartProps {
  data: BarData[]
  height?: number
  formatValue?: (v: number) => string
  delay?: number
}

function CustomTooltip({ active, payload, label, formatValue, revenueLabel }: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
  formatValue?: (v: number) => string
  revenueLabel: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)]/30 rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-[var(--color-on-surface)] mb-1">{label}</p>
      <p style={{ color: '#0D9488' }} className="leading-5">
        {revenueLabel}: <span className="font-bold">{formatValue ? formatValue(payload[0].value) : payload[0].value}</span>
      </p>
    </div>
  )
}

function BarTooltipContent({
  active,
  payload,
  label,
  formatValue,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
  formatValue: (v: number) => string
}) {
  const { t } = useTranslation()
  return (
    <CustomTooltip
      active={active}
      payload={payload}
      label={label}
      formatValue={formatValue}
      revenueLabel={t('reports.revenue')}
    />
  )
}

export function BarChart({ data, height = 300, formatValue = String }: BarChartProps) {
  const { t } = useTranslation()
  const chartData = data.map((d) => ({ month: d.label, revenue: d.value }))
  const { containerRef, dimensions } = useChartDimensions()
  const { width, height: measuredHeight } = dimensions

  return (
    <div ref={containerRef} className="w-full" style={{ height, minWidth: 0 }}>
      {width > 0 && measuredHeight > 0 && (
        <RechartsBarChart
          width={width}
          height={measuredHeight}
          data={chartData}
          margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
          barCategoryGap="30%"
        >
          {/* Faint horizontal grid lines — matches ChartCard & RevenueStats */}
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
            content={(props) => <BarTooltipContent {...props} formatValue={formatValue} />}
            cursor={{ fill: 'var(--color-outline-variant)', fillOpacity: 0.08 }}
          />
          <Bar
            dataKey="revenue"
            name={t('reports.revenue')}
            fill="#0D9488"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
          />
        </RechartsBarChart>
      )}
    </div>
  )
}

// ── Donut Chart (CSS-based) ───────────────────────────────────────────────────

interface DonutSegment { label: string; value: number; color: string }

interface DonutChartProps {
  segments: DonutSegment[]
  size?: number
  delay?: number
}

export function DonutChart({ segments, size = 120, delay = 0 }: DonutChartProps) {
  const total = segments.reduce((s, d) => s + d.value, 0)
  let cumulative = 0

  const paths = segments.map((seg) => {
    const pct = seg.value / total
    const startAngle = cumulative * 360
    const endAngle = (cumulative + pct) * 360
    cumulative += pct

    const r = 40
    const cx = 50; const cy = 50
    const startRad = ((startAngle - 90) * Math.PI) / 180
    const endRad = ((endAngle - 90) * Math.PI) / 180
    const x1 = cx + r * Math.cos(startRad)
    const y1 = cy + r * Math.sin(startRad)
    const x2 = cx + r * Math.cos(endRad)
    const y2 = cy + r * Math.sin(endRad)
    const largeArc = pct > 0.5 ? 1 : 0

    return { ...seg, d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`, pct }
  })

  return (
    <div className="flex items-center gap-4">
      <motion.svg
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay }}
        width={size} height={size} viewBox="0 0 100 100"
        className="shrink-0"
      >
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill={p.color} className="hover:opacity-80 transition-opacity cursor-pointer" />
        ))}
        <circle cx="50" cy="50" r="22" fill="var(--color-surface-container-lowest)" />
      </motion.svg>
      <div className="space-y-1.5">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-xs text-[var(--color-on-surface-variant)]">{s.label}</span>
            <span className="text-xs font-semibold text-[var(--color-on-surface)] ml-auto">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Chart Container wrapper ───────────────────────────────────────────────────

interface ChartContainerProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
  delay?: number
  className?: string
}

export function ChartContainer({ title, subtitle, action, children, delay = 0, className }: ChartContainerProps) {
  return (
    <SectionCard title={title} subtitle={subtitle} action={action} delay={delay} className={className}>
      {children}
    </SectionCard>
  )
}
