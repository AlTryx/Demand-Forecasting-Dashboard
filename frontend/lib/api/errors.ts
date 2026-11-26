import { ApiError } from "@/lib/api/client"

const FIELD_LABELS: Record<string, string> = {
  stock_keeping_unit: "SKU",
  current_stock: "Stock",
}

function fieldLabel(field: string) {
  return FIELD_LABELS[field] ?? field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, " ")
}

export function describeError(error: unknown): string {
  if (error instanceof ApiError && error.data && typeof error.data === "object") {
    const data = error.data as Record<string, unknown>
    if (typeof data.detail === "string") return data.detail
    if (typeof data.error === "string") return data.error

    const messages = Object.entries(data).flatMap(([field, value]) =>
      (Array.isArray(value) ? value : [value]).map((message) =>
        field === "non_field_errors" ? String(message) : `${fieldLabel(field)}: ${String(message)}`,
      ),
    )
    if (messages.length > 0) return messages.join(" ")
  }

  return error instanceof Error ? error.message : "Something went wrong. Please try again."
}
