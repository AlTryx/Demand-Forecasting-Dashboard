import { ArrowUpRight, AlertTriangle, CalendarRange, Layers, ShieldCheck, Euro } from "lucide-react"
import type { Product } from "@/lib/forecast-data"
import { getProductContext, getAggregateMetrics, formatCurrencyEUR } from "@/lib/forecast-data"

type KpiCardsProps = {
  product: Product
}

export function KpiCards({ product }: KpiCardsProps) {
  const isOverview = product.id === "overview"
  const context = !isOverview ? getProductContext(product.id) : null
  const aggregateMetrics = isOverview ? getAggregateMetrics() : null

  if (isOverview && aggregateMetrics) {
    return (
      <section
        aria-label="Key performance indicators"
        className="grid grid-cols-1 gap-6 md:grid-cols-3"
      >
        {/* Stockouts at Risk */}
        <article className="rounded-xl border border-border bg-card p-6">
          <header className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Stockouts at Risk
            </span>
            <span className="flex size-8 items-center justify-center rounded-md bg-amber-500/10 text-amber-600">
              <AlertTriangle className="size-4" aria-hidden="true" />
            </span>
          </header>
          <div className="mt-5 flex items-baseline gap-1.5">
            <span className="font-mono text-4xl font-semibold tracking-tight tabular-nums text-foreground">
              {aggregateMetrics.stockoutsAtRisk}
            </span>
            <span className="text-xl font-medium text-muted-foreground">SKUs</span>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <AlertTriangle className="size-3.5 text-amber-600" aria-hidden="true" />
            Risk in next week
          </p>
        </article>

        {/* Total Capital Required */}
        <article className="rounded-xl border border-border bg-card p-6">
          <header className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Total Capital Required
            </span>
            <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Euro className="size-4" aria-hidden="true" />
            </span>
          </header>
          <div className="mt-5 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold tracking-tight text-foreground">
              {formatCurrencyEUR(aggregateMetrics.totalCapital)}
            </span>
          </div>
          <p className="mt-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            EUR · for next forecast period
          </p>
        </article>

        {/* Model Accuracy */}
        <article className="rounded-xl border border-border bg-card p-6">
          <header className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Ensemble Accuracy
            </span>
            <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ShieldCheck className="size-4" aria-hidden="true" />
            </span>
          </header>
          <div className="mt-5 flex items-baseline gap-1.5">
            <span className="font-mono text-4xl font-semibold tracking-tight tabular-nums text-foreground">
              {product.accuracy.toFixed(2)}
            </span>
            <span className="text-xl font-medium text-muted-foreground">%</span>
          </div>
          <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
            All models combined
          </p>
        </article>
      </section>
    )
  }

  // Individual product KPI cards
  return (
    <section
      aria-label="Key performance indicators"
      className="grid grid-cols-1 gap-6 md:grid-cols-3"
    >
      {/* Lead Time */}
      <article className="rounded-xl border border-border bg-card p-6">
        <header className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Lead Time
          </span>
          <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <CalendarRange className="size-4" aria-hidden="true" />
          </span>
        </header>
        <div className="mt-5 flex items-baseline gap-1.5">
          <span className="font-mono text-4xl font-semibold tracking-tight tabular-nums text-foreground">
            {context?.leadTimeDays}
          </span>
          <span className="text-xl font-medium text-muted-foreground">days</span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          From supplier · {context?.storageVelocity} velocity
        </p>
      </article>

      {/* Safety Stock */}
      <article className="rounded-xl border border-border bg-card p-6">
        <header className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Safety Stock
          </span>
          <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Layers className="size-4" aria-hidden="true" />
          </span>
        </header>
        <div className="mt-5 flex items-baseline gap-1.5">
          <span className="font-mono text-4xl font-semibold tracking-tight tabular-nums text-foreground">
            {(context?.safetyStock ?? 0).toLocaleString("en-US")}
          </span>
          <span className="text-xl font-medium text-muted-foreground">units</span>
        </div>
        <p className="mt-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Buffer · 15% of peak forecast
        </p>
      </article>

      {/* Model Accuracy */}
      <article className="rounded-xl border border-border bg-card p-6">
        <header className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Model Accuracy
          </span>
          <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ShieldCheck className="size-4" aria-hidden="true" />
          </span>
        </header>
        <div className="mt-5 flex items-baseline gap-1.5">
          <span className="font-mono text-4xl font-semibold tracking-tight tabular-nums text-foreground">
            {product.accuracy.toFixed(2)}
          </span>
          <span className="text-xl font-medium text-muted-foreground">%</span>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-accent" aria-hidden="true" />
          95% confidence interval
        </p>
      </article>
    </section>
  )
}
