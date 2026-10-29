"use client"

import { useMemo, useState } from "react"
import { Download, Eye } from "lucide-react"
import type { ForecastResult } from "@/lib/types/analytics"
import { formatCurrencyEUR, formatNumber } from "@/lib/format"

const MAX_ROWS = 50

type ForecastTableProps = {
  forecasts: ForecastResult[] | null
}

type Row = {
  id: number
  targetDate: string
  productName: string
  predicted: number
  lower: number | null
  upper: number | null
  estimatedValue: number | null
  confidence: number
}

type ColumnKey = "targetDate" | "productName" | "predicted" | "range" | "estimatedValue" | "confidence"

const COLUMNS: { key: ColumnKey; label: string; align?: "right" }[] = [
  { key: "targetDate", label: "Target Date" },
  { key: "productName", label: "Product" },
  { key: "predicted", label: "Volume (units)", align: "right" },
  { key: "range", label: "Range", align: "right" },
  { key: "estimatedValue", label: "Est. Value (EUR)", align: "right" },
  { key: "confidence", label: "Confidence", align: "right" },
]

function toRows(forecasts: ForecastResult[]): Row[] {
  return [...forecasts]
    .sort((a, b) => b.generated_at.localeCompare(a.generated_at) || a.product - b.product)
    .slice(0, MAX_ROWS)
    .map((f) => {
      const price = f.product_price ? Number(f.product_price) : null
      return {
        id: f.id,
        targetDate: f.target_date,
        productName: f.product_name ?? `Product #${f.product}`,
        predicted: f.predicted_quantity,
        lower: f.lower_bound,
        upper: f.upper_bound,
        estimatedValue: price === null ? null : f.predicted_quantity * price,
        confidence: Number(f.confidence_score),
      }
    })
}

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`
}

export function ForecastTable({ forecasts }: ForecastTableProps) {
  const rows = useMemo(() => toRows(forecasts ?? []), [forecasts])
  const [visible, setVisible] = useState<Record<ColumnKey, boolean>>({
    targetDate: true,
    productName: true,
    predicted: true,
    range: true,
    estimatedValue: true,
    confidence: true,
  })
  const shown = COLUMNS.filter((column) => visible[column.key])

  const handleExport = () => {
    const headers = COLUMNS.map((c) => c.label)
    const lines = rows.map((row) =>
      [
        row.targetDate,
        row.productName,
        row.predicted,
        row.lower !== null && row.upper !== null ? `${row.lower}-${row.upper}` : "",
        row.estimatedValue === null ? "" : row.estimatedValue.toFixed(2),
        row.confidence.toFixed(4),
      ]
        .map(csvCell)
        .join(","),
    )
    const blob = new Blob([[headers.map(csvCell).join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `forecasts-${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const renderCell = (row: Row, key: ColumnKey) => {
    switch (key) {
      case "targetDate":
        return <span className="font-mono text-sm tabular-nums text-foreground">{row.targetDate}</span>
      case "productName":
        return (
          <div className="flex items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
              {row.productName.charAt(0).toUpperCase()}
            </div>
            <span className="truncate text-sm font-medium text-foreground">{row.productName}</span>
          </div>
        )
      case "predicted":
        return (
          <span className="font-mono text-sm font-medium tabular-nums text-foreground">
            {formatNumber(row.predicted)}
          </span>
        )
      case "range":
        return (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {row.lower !== null && row.upper !== null
              ? `${formatNumber(row.lower)} – ${formatNumber(row.upper)}`
              : "—"}
          </span>
        )
      case "estimatedValue":
        return (
          <span className="font-mono text-sm font-medium tabular-nums text-accent">
            {row.estimatedValue === null ? "—" : formatCurrencyEUR(row.estimatedValue)}
          </span>
        )
      case "confidence":
        return (
          <span
            className={
              row.confidence < 0.6
                ? "font-mono text-sm tabular-nums text-destructive"
                : "font-mono text-sm tabular-nums text-foreground"
            }
          >
            {Math.round(row.confidence * 100)}%
          </span>
        )
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex flex-col gap-4 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <h2 className="text-base font-semibold text-foreground">Latest Forecasts</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {rows.length ? `Most recent ${rows.length} predictions` : "No forecasts yet"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative group">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors"
              aria-label="Toggle columns"
            >
              <Eye className="size-4" aria-hidden="true" />
              Columns
            </button>
            <div className="absolute right-0 z-10 mt-1 hidden w-48 rounded-lg border border-border bg-card p-3 shadow-lg group-hover:flex flex-col gap-2">
              {COLUMNS.map((column) => (
                <label
                  key={column.key}
                  className="flex items-center gap-2 text-xs text-foreground cursor-pointer hover:text-primary"
                >
                  <input
                    type="checkbox"
                    checked={visible[column.key]}
                    onChange={() => setVisible((prev) => ({ ...prev, [column.key]: !prev[column.key] }))}
                    className="w-3 h-3 rounded"
                  />
                  {column.label}
                </label>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={!rows.length}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-50"
            aria-label="Export to CSV"
          >
            <Download className="size-4" aria-hidden="true" />
            Export CSV
          </button>
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-muted-foreground">
          Run a forecast to fill this table.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {shown.map((column) => (
                  <th
                    key={column.key}
                    className={`px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground ${
                      column.align === "right" ? "text-right" : ""
                    }`}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border last:border-0 transition-colors hover:bg-secondary/60"
                >
                  {shown.map((column) => (
                    <td
                      key={column.key}
                      className={`whitespace-nowrap px-6 py-4 ${column.align === "right" ? "text-right" : ""}`}
                    >
                      {renderCell(row, column.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
