import { useTranslation } from 'react-i18next'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend,
} from 'recharts'
import { SectionCard } from '@/components/ui/SectionCard'
import { BarChart3 } from 'lucide-react'
import { useChartDimensions } from '@/hooks/useChartDimensions'

interface MonthData {
  month: string
  revenue: number
  target?: number
}

interface RevenueStatsProps {
  data: MonthData[]
  title?: string
  delay?: number
  className?: string
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
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

export function RevenueStats({ data, title, delay = 0, className }: RevenueStatsProps) {
  const { t } = useTranslation()
  const resolvedTitle = title ?? t('finance.monthlyRevenue')
  const { containerRef, dimensions } = useChartDimensions()
  const { width, height } = dimensions

  return (
    <SectionCard title={resolvedTitle} icon={<BarChart3 size={15} />} delay={delay} className={className}>
      {/* Container gives the chart its dimensions — minWidth:0 prevents flex shrink issues */}
      <div ref={containerRef} className="w-full" style={{ height: 300, minWidth: 0 }}>
        {width > 0 && height > 0 && (
          <BarChart
            width={width}
            height={height}
            data={data}
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
            <Bar dataKey="revenue" name={t('reports.revenue')} fill="#0D9488" radius={[4, 4, 0, 0]} maxBarSize={36} />
            <Bar dataKey="target"  name={t('finance.target')}  fill="#CBD5E1" radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        )}
      </div>
    </SectionCard>
  )
}
