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
import type { TimelinePoint } from "@/lib/forecast-data"
import { formatCurrencyEUR } from "@/lib/forecast-data"

type TimelineChartProps = {
  data: TimelinePoint[]
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
  // Estimate price: avg 12.5 EUR/unit for visualization
  const estimatedValue = (value ?? 0) * 12.5
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
          {(value ?? 0).toLocaleString("en-US")} units
        </p>
        <p className="font-mono text-xs tabular-nums text-accent font-medium">
          ~ {formatCurrencyEUR(estimatedValue)} (est. value)
        </p>
      </div>
      {point.isForecast && point.lower != null && point.upper != null ? (
        <p className="mt-2 font-mono text-[11px] tabular-nums text-muted-foreground">
          CI: {point.lower.toLocaleString("en-US")} – {point.upper.toLocaleString("en-US")}
        </p>
      ) : null}
    </div>
  )
}

export function TimelineChart({ data }: TimelineChartProps) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex flex-col gap-1 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            Predictive Sales Timeline
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Last 4 weeks actual sales, ending in next week&apos;s forecast
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
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={48}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`}
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
        </div>
      </div>
    </section>
  )
}
