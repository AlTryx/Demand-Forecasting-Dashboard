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
import type { ForecastResult, TopProducts } from "@/lib/types/analytics"
import { formatCompact, formatNumber } from "@/lib/format"

const SHARE_COLORS = [
  "var(--chart-1)",
  "oklch(0.55 0.18 320)",
  "oklch(0.55 0.02 300)",
  "oklch(0.65 0.16 300)",
  "oklch(0.7 0.02 300)",
]
const OTHER_COLOR = "var(--muted)"
const LOW_CONFIDENCE = 0.75
const MAX_VOLATILITY_ROWS = 6

type DemandShare = {
  productId: number | "other"
  label: string
  volume: number
}

type VolatilityItem = {
  productId: number
  label: string
  sku: string | null
  confidenceScore: number
}

function toShareData(top: TopProducts | null): DemandShare[] {
  if (!top) return []
  const slices: DemandShare[] = top.items.map((item) => ({
    productId: item.id,
    label: item.name,
    volume: item.units,
  }))
  if (top.other.units > 0) {
    slices.push({
      productId: "other",
      label: `Other (${formatNumber(top.other.product_count)})`,
      volume: top.other.units,
    })
  }
  return slices
}

function toLowConfidence(forecasts: ForecastResult[] | null): VolatilityItem[] {
  if (!forecasts) return []
  const latestPerProduct = new Map<number, ForecastResult>()
  for (const forecast of forecasts) {
    const current = latestPerProduct.get(forecast.product)
    if (!current || forecast.generated_at > current.generated_at) {
      latestPerProduct.set(forecast.product, forecast)
    }
  }
  return [...latestPerProduct.values()]
    .map((f) => ({
      productId: f.product,
      label: f.product_name ?? `Product #${f.product}`,
      sku: f.product_sku ?? null,
      confidenceScore: Number(f.confidence_score),
    }))
    .filter((item) => item.confidenceScore < LOW_CONFIDENCE)
    .sort((a, b) => a.confidenceScore - b.confidenceScore)
}

function sliceColor(slice: DemandShare, index: number) {
  return slice.productId === "other" ? OTHER_COLOR : SHARE_COLORS[index % SHARE_COLORS.length]
}

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
        {formatNumber(slice.volume)} units
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
          {item.sku && <span className="font-mono text-xs text-muted-foreground">{item.sku}</span>}
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
          {isCritical ? "Critical" : "Review"}
        </Badge>
      </div>
    </li>
  )
}

type ForecastAnalyticsGridProps = {
  topProducts: TopProducts | null
  forecasts: ForecastResult[] | null
  shareWeeks: number
}

export default function ForecastAnalyticsGrid({
  topProducts,
  forecasts,
  shareWeeks,
}: ForecastAnalyticsGridProps) {
  const shareData = toShareData(topProducts)
  const total = shareData.reduce((sum, slice) => sum + slice.volume, 0)
  const lowConfidence = toLowConfidence(forecasts)
  const hasForecasts = (forecasts?.length ?? 0) > 0

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Left: Demand Share Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Demand Share Distribution</CardTitle>
          <CardDescription>
            Share of units sold in the last {shareWeeks} weeks · top {topProducts?.items.length ?? 0} products
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
                    <Cell key={slice.productId} fill={sliceColor(slice, index)} />
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
                {formatCompact(total)}
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
                  <span className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: sliceColor(slice, index) }}
                    />
                    <span className="truncate">{slice.label}</span>
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
            Forecasts below {LOW_CONFIDENCE * 100}% confidence · {lowConfidence.length} flagged
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasForecasts ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No forecasts yet. Run a forecast to score each product.
            </p>
          ) : lowConfidence.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              All forecasts are within the confidence tolerance.
            </p>
          ) : (
            <>
              <ul className="flex flex-col gap-2.5">
                {lowConfidence.slice(0, MAX_VOLATILITY_ROWS).map((item) => (
                  <VolatilityRow key={item.productId} item={item} />
                ))}
              </ul>
              {lowConfidence.length > MAX_VOLATILITY_ROWS && (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  + {formatNumber(lowConfidence.length - MAX_VOLATILITY_ROWS)} more low-confidence products
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
