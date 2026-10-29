export const REQUIRED_COLUMNS = ["date", "product", "units", "revenue"] as const

export type CsvRow = Record<string, string>

export type PreviewCheck = {
  errors: string[]
  warnings: string[]
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const INTEGER = /^\d+$/
const DECIMAL = /^-?\d+(\.\d+)?$/

export function checkCsvPreview(headers: string[], rows: CsvRow[]): PreviewCheck {
  const errors: string[] = []
  const warnings: string[] = []

  const normalized = headers.map((h) => h.trim().toLowerCase())
  const missing = REQUIRED_COLUMNS.filter((column) => !normalized.includes(column))
  if (missing.length) {
    errors.push(`Missing required columns: ${missing.join(", ")}`)
    return { errors, warnings }
  }
  if (rows.length === 0) {
    errors.push("The file has a header row but no data.")
    return { errors, warnings }
  }

  const column = (name: string) => headers[normalized.indexOf(name)]

  rows.forEach((row, index) => {
    const line = index + 2
    const date = row[column("date")]?.trim() ?? ""
    const product = row[column("product")]?.trim() ?? ""
    const units = row[column("units")]?.trim() ?? ""
    const revenue = row[column("revenue")]?.trim() ?? ""

    if (!ISO_DATE.test(date) || Number.isNaN(Date.parse(date))) {
      errors.push(`Line ${line}: date "${date}" must look like 2024-01-31.`)
    }
    if (!product) errors.push(`Line ${line}: product is empty.`)
    if (!INTEGER.test(units)) errors.push(`Line ${line}: units "${units}" must be a whole number ≥ 0.`)
    if (!DECIMAL.test(revenue)) {
      errors.push(`Line ${line}: revenue "${revenue}" must be a number with a dot, e.g. 12.50.`)
    }
  })

  const extra = normalized.filter((h) => h && !(REQUIRED_COLUMNS as readonly string[]).includes(h))
  if (extra.length) warnings.push(`Extra columns will be ignored: ${extra.join(", ")}`)

  return { errors: errors.slice(0, 5), warnings }
}
