import type { ReactNode } from "react"
import { ArrowDownRight, ArrowUpRight, Euro, Package, Sparkles } from "lucide-react"
import type { ForecastPoint, SalesSummary } from "@/lib/types/analytics"
import { formatCurrencyEUR, formatDate, formatNumber, percentChange } from "@/lib/format"
import { cn } from "@/lib/utils"

type KpiCardsProps = {
  summary: SalesSummary | null
  forecast: ForecastPoint | null
  isOverview: boolean
}

export function KpiCards({ summary, forecast, isOverview }: KpiCardsProps) {
  if (!summary) {
    return (
      <section aria-label="Key performance indicators" className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[154px] animate-pulse rounded-xl border border-border bg-card" />
        ))}
      </section>
    )
  }

  const change = percentChange(summary.last_week_units, summary.previous_week_units)
  const forecastValue =
    forecast && summary.avg_unit_price !== null ? forecast.predicted * summary.avg_unit_price : null

  return (
    <section aria-label="Key performance indicators" className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <KpiCard
        title="Total Revenue"
        icon={<Euro className="size-4" aria-hidden="true" />}
        value={<span className="text-2xl">{formatCurrencyEUR(summary.total_revenue)}</span>}
        footer={
          summary.date_from && summary.date_to
            ? `${formatDate(summary.date_from)} – ${formatDate(summary.date_to)}${
                isOverview ? ` · ${formatNumber(summary.product_count)} products` : ""
              }`
            : "No sales yet"
        }
      />

      <KpiCard
        title="Units Last Week"
        icon={<Package className="size-4" aria-hidden="true" />}
        value={
          <>
            <span className="text-4xl">{formatNumber(summary.last_week_units)}</span>
            <span className="text-xl font-medium text-muted-foreground">units</span>
          </>
        }
        footer={
          change === null ? (
            "No previous week to compare"
          ) : (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
                change >= 0 ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive",
              )}
            >
              {change >= 0 ? (
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              ) : (
                <ArrowDownRight className="size-3.5" aria-hidden="true" />
              )}
              {Math.abs(change).toFixed(1)}% vs previous week
            </span>
          )
        }
      />

      <KpiCard
        title="Next Week Forecast"
        icon={<Sparkles className="size-4" aria-hidden="true" />}
        value={
          forecast ? (
            <>
              <span className="text-4xl">{formatNumber(forecast.predicted)}</span>
              <span className="text-xl font-medium text-muted-foreground">units</span>
            </>
          ) : (
            <span className="text-2xl text-muted-foreground">—</span>
          )
        }
        footer={
          forecast
            ? `${forecastValue !== null ? `≈ ${formatCurrencyEUR(forecastValue)} · ` : ""}${Math.round(
                forecast.confidence * 100,
              )}% confidence`
            : "Not run yet · use Run forecast"
        }
      />
    </section>
  )
}

function KpiCard({
  title,
  icon,
  value,
  footer,
}: {
  title: string
  icon: ReactNode
  value: ReactNode
  footer: ReactNode
}) {
  return (
    <article className="rounded-xl border border-border bg-card p-6">
      <header className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</span>
      </header>
      <div className="mt-5 flex items-baseline gap-1.5 font-mono font-semibold tracking-tight tabular-nums text-foreground">
        {value}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{footer}</p>
    </article>
  )
}
