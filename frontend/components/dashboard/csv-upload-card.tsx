"use client"

import { useRef, useState } from "react"
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useCsvImport, type CsvImportState } from "@/lib/hooks/use-csv-import"
import { REQUIRED_COLUMNS } from "@/lib/csv-validation"
import { MAX_UPLOAD_BYTES } from "@/lib/api/sales-import-service"
import { formatBytes, formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

const PREVIEW_VISIBLE_ROWS = 5

type CsvUploadCardProps = {
  onImported: () => void
  hasExistingData: boolean
}

export function CsvUploadCard({ onImported, hasExistingData }: CsvUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const { state, selectFile, startUpload, cancelUpload, reset } = useCsvImport(onImported)

  const busy = state.kind === "checking" || state.kind === "uploading" || state.kind === "processing"

  const pickFile = (file: File | undefined) => {
    if (file && !busy) selectFile(file)
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <Card className="border border-border bg-card/70 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">CSV import</CardTitle>
            <CardDescription className="mt-1">
              Upload daily sales. Rows with the same product and date overwrite existing ones;
              everything else is kept.
            </CardDescription>
          </div>
          <div className="rounded-lg border border-border bg-secondary p-2 text-primary">
            <FileSpreadsheet className="size-5" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => pickFile(event.target.files?.[0])}
        />

        {(state.kind === "idle" || state.kind === "invalid") && (
          <div
            className={cn(
              "rounded-xl border-2 border-dashed p-5 text-center transition-colors",
              dragging ? "border-primary bg-primary/5" : "border-border bg-secondary/30",
            )}
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              pickFile(event.dataTransfer.files?.[0])
            }}
          >
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="rounded-full bg-primary/10 p-3 text-primary">
                <Upload className="size-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Drop a CSV here or browse</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Columns: {REQUIRED_COLUMNS.join(", ")} · up to {formatBytes(MAX_UPLOAD_BYTES)}
                </p>
              </div>
              <Button type="button" size="sm" onClick={() => inputRef.current?.click()}>
                Select CSV
              </Button>
            </div>
          </div>
        )}

        {state.kind !== "idle" && <FileBar state={state} onClear={busy ? undefined : reset} />}

        {state.kind === "checking" && (
          <StatusLine icon={<Loader2 className="size-4 animate-spin" />}>Checking the file…</StatusLine>
        )}

        {state.kind === "invalid" && <ErrorBox messages={state.errors} />}

        {state.kind === "ready" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
              <CheckCircle2 className="size-4" />
              The first rows look valid. The server checks the rest during import.
            </div>
            {state.warnings.map((warning) => (
              <StatusLine key={warning} icon={<AlertTriangle className="size-4 text-amber-600" />}>
                {warning}
              </StatusLine>
            ))}
            <PreviewTable headers={state.headers} rows={state.preview.slice(0, PREVIEW_VISIBLE_ROWS)} />
            {hasExistingData && (
              <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700">
                Existing sales for the same products and dates will be replaced with the values from this file.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={reset}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={startUpload}>
                <Upload className="size-4" />
                Import {formatBytes(state.file.size)}
              </Button>
            </div>
          </div>
        )}

        {state.kind === "uploading" && (
          <div className="space-y-2">
            <ProgressBar value={state.progress} />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Uploading… {Math.round(state.progress * 100)}%</span>
              <button type="button" onClick={cancelUpload} className="font-medium hover:text-foreground">
                Cancel
              </button>
            </div>
          </div>
        )}

        {state.kind === "processing" && (
          <div className="space-y-2">
            <ProgressBar indeterminate />
            <StatusLine icon={<Loader2 className="size-4 animate-spin" />}>
              Importing on the server · {formatNumber(state.job.rows_processed)} rows processed. You can
              keep using the dashboard.
            </StatusLine>
          </div>
        )}

        {state.kind === "done" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
              <CheckCircle2 className="size-4" />
              Import finished
            </div>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Rows processed" value={state.job.rows_processed} />
              <Stat label="Rows written" value={state.job.rows_written} />
              <Stat label="New products" value={state.job.products_created} />
              <Stat label="Rows skipped" value={state.job.rows_skipped} warn={state.job.rows_skipped > 0} />
            </dl>
            {state.job.row_errors.length > 0 && <ErrorBox messages={state.job.row_errors} tone="warning" />}
            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={reset}>
                Import another file
              </Button>
            </div>
          </div>
        )}

        {state.kind === "failed" && (
          <div className="space-y-3">
            <ErrorBox messages={[state.message, ...(state.job?.row_errors ?? [])]} />
            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={reset}>
                Try again
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function FileBar({ state, onClear }: { state: Exclude<CsvImportState, { kind: "idle" }>; onClear?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
      <span className="min-w-0 truncate">
        <span className="font-medium text-foreground">{state.file.name}</span> · {formatBytes(state.file.size)}
      </span>
      {onClear && (
        <button type="button" onClick={onClear} aria-label="Remove file" className="hover:text-foreground">
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}

function StatusLine({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm text-muted-foreground">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  )
}

function ErrorBox({ messages, tone = "error" }: { messages: string[]; tone?: "error" | "warning" }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
        tone === "error"
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-amber-500/30 bg-amber-500/5 text-amber-700",
      )}
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <ul className="space-y-1">
        {messages.map((message, index) => (
          <li key={`${index}-${message}`}>{message}</li>
        ))}
      </ul>
    </div>
  )
}

function ProgressBar({ value = 0, indeterminate = false }: { value?: number; indeterminate?: boolean }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className={cn("h-full rounded-full bg-primary transition-[width] duration-200", indeterminate && "animate-pulse")}
        style={{ width: indeterminate ? "100%" : `${Math.round(value * 100)}%` }}
      />
    </div>
  )
}

function Stat({ label, value, warn = false }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={cn("font-mono text-lg font-semibold tabular-nums", warn ? "text-amber-600" : "text-foreground")}>
        {formatNumber(value)}
      </dd>
    </div>
  )
}

function PreviewTable({ headers, rows }: { headers: string[]; rows: Record<string, string>[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-secondary text-muted-foreground">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-3 py-2 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-border">
                {headers.map((header) => (
                  <td key={header} className="whitespace-nowrap px-3 py-2 text-foreground">
                    {row[header]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default CsvUploadCard
