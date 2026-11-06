import type { ComponentType } from "react"
import { CalendarRange, Euro, Gauge } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ProductRef, SalesSummary } from "@/lib/types/analytics"
import { formatDate, formatNumber, formatPriceEUR } from "@/lib/format"

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

type MetricCellProps = {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  label: string
  value: string | number
  unit?: string
}

function MetricCell({ icon: Icon, label, value, unit }: MetricCellProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-4">
      <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3.5" aria-hidden={true} />
        {label}
      </span>
      <span className="flex items-baseline gap-1">
        <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">{value}</span>
        {unit ? <span className="text-sm font-medium text-muted-foreground">{unit}</span> : null}
      </span>
    </div>
  )
}

function weeksBetween(from: string, to: string) {
  return Math.max(1, (Date.parse(to) - Date.parse(from)) / MS_PER_WEEK + 1 / 7)
}

type ProductContextPanelProps = {
  summary: SalesSummary | null
  product: ProductRef | null
}

export default function ProductContextPanel({ summary, product }: ProductContextPanelProps) {
  if (!summary?.date_from || !summary.date_to) return null

  const weeks = weeksBetween(summary.date_from, summary.date_to)

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {product ? product.sku ?? `#${product.id}` : `${formatNumber(summary.product_count)} products`}
        </span>
        <CardTitle className="text-base">Sales Profile{product ? `: ${product.name}` : ""}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricCell
            icon={Gauge}
            label="Avg weekly units"
            value={formatNumber(summary.total_units / weeks)}
            unit="units"
          />
          <MetricCell
            icon={Euro}
            label="Avg unit price"
            value={summary.avg_unit_price === null ? "—" : formatPriceEUR(summary.avg_unit_price)}
          />
          <MetricCell
            icon={CalendarRange}
            label="Data range"
            value={formatNumber(weeks)}
            unit={`weeks · since ${formatDate(summary.date_from)}`}
          />
        </div>
      </CardContent>
    </Card>
  )
}
