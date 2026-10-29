"use client"

import { useRef, useState } from "react"
import Papa from "papaparse"
import { AlertCircle, CheckCircle2, FileSpreadsheet, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const requiredColumns = ["date", "product", "units", "revenue"]

export function CsvUploadCard() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [error, setError] = useState("")
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState("")

  const handleFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please upload a CSV file.")
      return
    }

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const parsedData = result.data.filter((row) =>
          Object.values(row).some((value) => value !== undefined && String(value).trim() !== ""),
        )

        if (!parsedData.length) {
          setError("The CSV file appears to be empty.")
          return
        }

        const headers = Object.keys(parsedData[0])
        const missingColumns = requiredColumns.filter((column) => !headers.some((header) => header.toLowerCase() === column))

        if (missingColumns.length > 0) {
          setError(`Missing required columns: ${missingColumns.join(", ")}`)
          return
        }

        setFileName(file.name)
        setRows(parsedData.slice(0, 5))
        setError("")
      },
      error: () => {
        setError("Unable to parse the selected CSV file.")
      },
    })
  }

  return (
    <Card className="border border-border bg-card/70 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">CSV import</CardTitle>
            <CardDescription className="mt-1">
              Upload a sales dataset to review and validate before forecasting.
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
          accept=".csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) {
              handleFile(file)
            }
          }}
        />

        <div
          className={`rounded-xl border-2 border-dashed p-5 text-center transition-colors ${
            dragging ? "border-primary bg-primary/5" : "border-border bg-secondary/30"
          }`}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)

            const file = event.dataTransfer.files?.[0]
            if (file) {
              handleFile(file)
            }
          }}
        >
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <Upload className="size-5" />
            </div>

            <div>
              <p className="text-sm font-medium text-foreground">Drop a CSV here or browse</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Expected columns: date, product, units, revenue
              </p>
            </div>

            <Button type="button" size="sm" onClick={() => inputRef.current?.click()}>
              Select CSV
            </Button>
          </div>
        </div>

        {fileName && (
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Loaded file: <span className="font-medium text-foreground">{fileName}</span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {rows.length > 0 && !error && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
              <CheckCircle2 className="size-4" />
              CSV structure is valid.
            </div>

            <div className="overflow-hidden rounded-lg border border-border bg-background">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-secondary text-muted-foreground">
                    <tr>
                      {Object.keys(rows[0]).map((header) => (
                        <th key={header} className="px-3 py-2 font-medium">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={`${Object.values(row).join("-")}-${index}`} className="border-t border-border">
                        {Object.values(row).map((value, rowIndex) => (
                          <td key={`${value}-${rowIndex}`} className="px-3 py-2 text-foreground">
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default CsvUploadCard
