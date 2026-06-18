import type { ComponentType } from "react"
import { Clock, Gauge, Info, LayoutGrid, PackageCheck } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { ProductContext } from "@/lib/forecast-data"

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
        <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">
          {value}
        </span>
        {unit ? (
          <span className="text-sm font-medium text-muted-foreground">{unit}</span>
        ) : null}
      </span>
    </div>
  )
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  })
}

type ProductContextPanelProps = {
  context: ProductContext | null
  isOverview?: boolean
  productCount?: number
}

export default function ProductContextPanel({
  context,
  isOverview = false,
  productCount = 0,
}: ProductContextPanelProps) {
  if (!context) return null

  // On the Overview tab there is no single "lead time" or "safety stock" that
  // makes sense across every SKU (e.g. a 40-day China lead time vs a 2-day
  // local supplier). Show guidance instead of one product's numbers.
  if (isOverview) {
    return (
      <Card>
        <CardHeader className="border-b border-border">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            ALL-SKUS
          </span>
          <CardTitle className="text-base">Inventory Target Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 rounded-lg border border-dashed border-border bg-muted px-4 py-5">
            <LayoutGrid
              className="mt-0.5 size-5 shrink-0 text-muted-foreground"
              aria-hidden={true}
            />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Lead time and safety stock vary per product
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Select one of the {productCount} products in the sidebar to see
                its individual lead time, storage velocity, and safety stock
                buffer.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {context.sku}
        </span>
        <CardTitle className="text-base">
          Inventory Target Profile: {context.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricCell
            icon={Clock}
            label="Avg Lead Time"
            value={context.leadTimeDays}
            unit="days"
          />
          <MetricCell
            icon={Gauge}
            label="Storage Velocity"
            value={context.storageVelocity}
          />
          <MetricCell
            icon={PackageCheck}
            label="Safety Stock"
            value={context.safetyStock.toLocaleString("en-US")}
            unit="units"
          />
        </div>

        <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted px-4 py-3">
          <Info
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden={true}
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Inference derived from ML Training Run pipeline on{" "}
            <span className="font-mono text-foreground">
              {formatTimestamp(context.generatedAt)}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
