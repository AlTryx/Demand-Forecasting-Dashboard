"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { AlertTriangle, ShieldAlert } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { DemandShare, VolatilityItem } from "@/lib/forecast-data"

// Purple / violet / slate palette for the donut slices.
const SHARE_COLORS = [
  "var(--chart-1)", // purple
  "oklch(0.55 0.18 320)", // violet
  "oklch(0.55 0.02 300)", // slate
  "oklch(0.65 0.16 300)", // light violet
  "oklch(0.7 0.02 300)", // light slate
]

type ShareTooltipProps = {
  active?: boolean
  payload?: Array<{ payload: DemandShare }>
  total: number
}

function ShareTooltip({ active, payload, total }: ShareTooltipProps) {
  if (!active || !payload?.length) return null
  const slice = payload[0].payload
  const pct = ((slice.volume / total) * 100).toFixed(1)
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-sm">
      <p className="mb-0.5 text-xs font-medium text-foreground">{slice.label}</p>
      <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
        {pct}%
      </p>
      <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
        {slice.volume.toLocaleString("en-US")} units
      </p>
    </div>
  )
}

function VolatilityRow({ item }: { item: VolatilityItem }) {
  const isCritical = item.confidenceScore < 0.6
  return (
    <li className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background px-4 py-3">
      <div className="flex items-center gap-3">
        <span
          className={
            isCritical
              ? "flex size-8 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive"
              : "flex size-8 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-600"
          }
        >
          {isCritical ? (
            <ShieldAlert className="size-4" aria-hidden="true" />
          ) : (
            <AlertTriangle className="size-4" aria-hidden="true" />
          )}
        </span>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">{item.label}</span>
          <span className="font-mono text-xs text-muted-foreground">{item.sku}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
          {item.confidenceScore.toFixed(2)}
        </span>
        <Badge
          variant={isCritical ? "destructive" : "outline"}
          className={
            isCritical
              ? "shrink-0"
              : "shrink-0 border-amber-500/40 bg-amber-500/10 text-amber-700"
          }
        >
          High Volatility Matrix
        </Badge>
      </div>
    </li>
  )
}

type ForecastAnalyticsGridProps = {
  shareData?: DemandShare[]
  volatilityData?: VolatilityItem[]
}

export default function ForecastAnalyticsGrid({
  shareData = [],
  volatilityData = [],
}: ForecastAnalyticsGridProps) {
  const total = shareData.reduce((sum, slice) => sum + slice.volume, 0)
  const lowConfidence = volatilityData.filter(
    (item) => item.confidenceScore < 0.75,
  )

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Left: Demand Share Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Demand Share Distribution</CardTitle>
          <CardDescription>
            Product contribution to next week&apos;s total forecast volume
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <div className="relative h-56 w-56 shrink-0">
            <ResponsiveContainer
              width="100%"
              height="100%"
              className="focus:outline-none"
            >
              <PieChart tabIndex={-1}>
                <Pie
                  data={shareData}
                  dataKey="volume"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={64}
                  outerRadius={92}
                  paddingAngle={2}
                  stroke="var(--card)"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {shareData.map((slice, index) => (
                    <Cell
                      key={slice.productId}
                      fill={SHARE_COLORS[index % SHARE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={<ShareTooltip total={total} />}
                  isAnimationActive={false}
                  animationDuration={0}
                  animationEasing="linear"
                  wrapperStyle={{ zIndex: 50, transition: "none" }}
                  contentStyle={{ zIndex: 50, pointerEvents: "none" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">
                {(total / 1000).toFixed(1)}k
              </span>
              <span className="text-xs text-muted-foreground">total units</span>
            </div>
          </div>
          <ul className="flex w-full flex-col gap-2.5">
            {shareData.map((slice, index) => {
              const pct = total
                ? ((slice.volume / total) * 100).toFixed(1)
                : "0.0"
              return (
                <li
                  key={slice.productId}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="flex items-center gap-2 text-sm text-foreground">
                    <span
                      className="size-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          SHARE_COLORS[index % SHARE_COLORS.length],
                      }}
                    />
                    {slice.label}
                  </span>
                  <span className="font-mono text-sm font-medium tabular-nums text-muted-foreground">
                    {pct}%
                  </span>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>

      {/* Right: Prediction Volatility Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prediction Volatility Grid</CardTitle>
          <CardDescription>
            Low-confidence nodes flagged for review · {lowConfidence.length}{" "}
            active
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lowConfidence.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              All nodes within confidence tolerance.
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {lowConfidence.map((item) => (
                <VolatilityRow key={item.productId} item={item} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
