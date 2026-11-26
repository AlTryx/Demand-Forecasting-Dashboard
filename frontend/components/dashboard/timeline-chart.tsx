"use client"

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { SalesTimeline } from "@/lib/types/analytics"
import { formatCompact, formatCurrencyEUR, formatNumber, formatWeekLabel } from "@/lib/format"

type TimelinePoint = {
  label: string
  actual: number | null
  predicted: number | null
  lower: number | null
  upper: number | null
  revenue: number | null
  isForecast: boolean
}

type TimelineChartProps = {
  timeline: SalesTimeline | null
  avgUnitPrice: number | null
}

function toPoints(timeline: SalesTimeline, avgUnitPrice: number | null): TimelinePoint[] {
  const points: TimelinePoint[] = timeline.weeks.map((week) => ({
    label: formatWeekLabel(week.week_start),
    actual: week.units,
    predicted: null,
    lower: null,
    upper: null,
    revenue: week.revenue,
    isForecast: false,
  }))

  const { forecast } = timeline
  if (forecast && points.length) {
    const last = points[points.length - 1]
    last.predicted = last.actual
    last.lower = last.actual
    last.upper = last.actual
    points.push({
      label: formatWeekLabel(forecast.week_start),
      actual: null,
      predicted: forecast.predicted,
      lower: forecast.lower ?? forecast.predicted,
      upper: forecast.upper ?? forecast.predicted,
      revenue: avgUnitPrice === null ? null : forecast.predicted * avgUnitPrice,
      isForecast: true,
    })
  }
  return points
}

const MAX_TICKS = 7

function pickTicks(points: TimelinePoint[]): string[] {
  const nowIndex = points.findLastIndex((p) => !p.isForecast)
  const step = Math.max(1, Math.ceil((nowIndex + 1) / (MAX_TICKS - 1)))
  return points
    .filter((p, i) => p.isForecast || (nowIndex - i) % step === 0)
    .map((p) => p.label)
}

function AxisTick({
  x = 0,
  y = 0,
  payload,
  nowLabel,
  nextLabel,
}: {
  x?: number
  y?: number
  payload?: { value: string }
  nowLabel?: string
  nextLabel?: string
}) {
  const value = payload?.value ?? ""
  const marker = value === nextLabel ? "next" : value === nowLabel ? "now" : null
  return (
    <text x={x} y={y} dy={16} textAnchor="middle" fontSize={12} fill="var(--muted-foreground)">
      <tspan x={x}>{value}</tspan>
      {marker ? (
        <tspan
          x={x}
          dy={14}
          fontSize={11}
          fontWeight={500}
          fill={marker === "next" ? "var(--chart-1)" : "var(--foreground)"}
        >
          {marker}
        </tspan>
      ) : null}
    </text>
  )
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ payload: TimelinePoint }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  const value = point.isForecast ? point.predicted : point.actual
  return (
    <div className="rounded-lg border border-border bg-popover px-4 py-3 shadow-lg">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {label}
        <span
          className={
            point.isForecast
              ? "rounded-sm bg-[var(--chart-1)]/10 px-1.5 py-0.5 font-medium text-[var(--chart-1)]"
              : "rounded-sm bg-muted px-1.5 py-0.5 font-medium text-muted-foreground"
          }
        >
          {point.isForecast ? "Forecast" : "Actual"}
        </span>
      </p>
      <div className="space-y-1">
        <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
          {formatNumber(value ?? 0)} units
        </p>
        {point.revenue !== null && (
          <p className="font-mono text-xs tabular-nums text-accent font-medium">
            {point.isForecast ? "≈ " : ""}
            {formatCurrencyEUR(point.revenue)}
            {point.isForecast ? " (est.)" : ""}
          </p>
        )}
      </div>
      {point.isForecast && point.lower != null && point.upper != null ? (
        <p className="mt-2 font-mono text-[11px] tabular-nums text-muted-foreground">
          Range: {formatNumber(point.lower)} – {formatNumber(point.upper)}
        </p>
      ) : null}
    </div>
  )
}

export function TimelineChart({ timeline, avgUnitPrice }: TimelineChartProps) {
  const data = timeline ? toPoints(timeline, avgUnitPrice) : []
  const weeks = timeline?.weeks.length ?? 0
  const ticks = pickTicks(data)
  const nowLabel = data.findLast((p) => !p.isForecast)?.label
  const nextLabel = data.find((p) => p.isForecast)?.label

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex flex-col gap-1 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            Predictive Sales Timeline
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {timeline?.forecast
              ? `Last ${weeks} weeks of sales, ending in next week's forecast`
              : `Last ${weeks} weeks of sales · run a forecast to see next week`}
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-0.5 w-3 rounded-full bg-[var(--chart-5)]" />
            Actual
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-0.5 w-3 rounded-full bg-[var(--chart-1)]" />
            Forecast
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2.5 rounded-full bg-[var(--chart-2)]" />
            Confidence
          </span>
        </div>
      </header>

      <div className="px-2 py-6 sm:px-4">
        <div className="h-80 w-full min-h-80 min-w-0">
          {!timeline ? (
            <div className="size-full animate-pulse rounded-lg bg-secondary/50" />
          ) : (
          <ResponsiveContainer width="100%" height="100%" className="focus:outline-none">
            <ComposedChart
              data={data}
              margin={{ top: 8, right: 16, left: 4, bottom: 0 }}
              tabIndex={-1}
            >
              <defs>
                <linearGradient id="bandFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                ticks={ticks}
                interval={0}
                height={44}
                tick={<AxisTick nowLabel={nowLabel} nextLabel={nextLabel} />}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={48}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                tickFormatter={(v: number) => formatCompact(v)}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                isAnimationActive={false}
                animationDuration={0}
              />
              <Area
                type="monotone"
                dataKey="upper"
                stroke="none"
                fill="url(#bandFill)"
                connectNulls
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="lower"
                stroke="none"
                fill="var(--background)"
                fillOpacity={1}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="var(--chart-5)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "var(--chart-5)", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "var(--chart-5)", stroke: "var(--card)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="var(--chart-1)"
                strokeWidth={2.5}
                strokeDasharray="5 4"
                connectNulls
                dot={{ r: 3, fill: "var(--chart-1)", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "var(--chart-1)", stroke: "var(--card)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  )
}
