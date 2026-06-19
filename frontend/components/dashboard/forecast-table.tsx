"use client"

import { useState } from "react"
import { Download, Eye, EyeOff } from "lucide-react"
import type { ForecastLog } from "@/lib/forecast-data"
import { formatCurrencyEUR } from "@/lib/forecast-data"

type ForecastTableProps = {
  rows: ForecastLog[]
}

type VisibleColumns = {
  targetDate: boolean
  productName: boolean
  predictedVolume: boolean
  estimatedValue: boolean
  status: boolean
}

export function ForecastTable({ rows }: ForecastTableProps) {
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>({
    targetDate: true,
    productName: true,
    predictedVolume: true,
    estimatedValue: true,
    status: true,
  })

  const handleExport = () => {
    // CSV export
    const headers = [
      "Target Date",
      "Product Name",
      "Predicted Volume",
      "Estimated Value (EUR)",
      "Status",
    ]
    const csvRows = rows.map((row) => [
      row.targetDate,
      row.productName,
      row.predictedVolume.toString(),
      (row.predictedVolume * row.pricePerUnit).toString(),
      "Confirmed",
    ])

    const csv = [
      headers.join(","),
      ...csvRows.map((r) => r.map((cell) => `"${cell}"`).join(",")),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `forecast-log-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const toggleColumn = (column: keyof VisibleColumns) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [column]: !prev[column],
    }))
  }

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex flex-col gap-4 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <h2 className="text-base font-semibold text-foreground">
            Recent Forecast Log
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Latest entries from the prediction stream
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Column visibility toggle */}
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
              {Object.entries(visibleColumns).map(([col, visible]) => (
                <label key={col} className="flex items-center gap-2 text-xs text-foreground cursor-pointer hover:text-primary">
                  <input
                    type="checkbox"
                    checked={visible}
                    onChange={() => toggleColumn(col as keyof VisibleColumns)}
                    className="w-3 h-3 rounded"
                  />
                  {col === "targetDate" && "Target Date"}
                  {col === "productName" && "Product Name"}
                  {col === "predictedVolume" && "Volume"}
                  {col === "estimatedValue" && "Est. Value (EUR)"}
                  {col === "status" && "Status"}
                </label>
              ))}
            </div>
          </div>

          {/* Export button */}
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors"
            aria-label="Export to CSV"
          >
            <Download className="size-4" aria-hidden="true" />
            Export CSV
          </button>

          <span className="hidden items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground sm:inline-flex">
            <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
            Streaming
          </span>
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              {visibleColumns.targetDate && (
                <th className="px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Target Date
                </th>
              )}
              {visibleColumns.productName && (
                <th className="px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Product
                </th>
              )}
              {visibleColumns.predictedVolume && (
                <th className="px-6 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Volume (units)
                </th>
              )}
              {visibleColumns.estimatedValue && (
                <th className="px-6 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Est. Value (EUR)
                </th>
              )}
              {visibleColumns.status && (
                <th className="px-6 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row.targetDate}-${row.productId}`}
                className="border-b border-border last:border-0 transition-colors hover:bg-secondary/60"
              >
                {visibleColumns.targetDate && (
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="font-mono text-sm tabular-nums text-foreground">
                      {row.targetDate}
                    </span>
                  </td>
                )}
                {visibleColumns.productName && (
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                        {row.productName.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-foreground truncate">
                        {row.productName}
                      </span>
                    </div>
                  </td>
                )}
                {visibleColumns.predictedVolume && (
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <span className="font-mono text-sm font-medium tabular-nums text-foreground">
                      {row.predictedVolume.toLocaleString("en-US")}
                    </span>
                    <span className="ml-1 text-xs text-muted-foreground">
                      {row.unit}
                    </span>
                  </td>
                )}
                {visibleColumns.estimatedValue && (
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <span className="font-mono text-sm font-medium tabular-nums text-accent">
                      {formatCurrencyEUR(row.predictedVolume * row.pricePerUnit)}
                    </span>
                  </td>
                )}
                {visibleColumns.status && (
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent">
                      <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
                      Confirmed
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
