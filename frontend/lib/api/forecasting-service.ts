import { apiFetch } from "@/lib/api/client"
import type { ForecastResult, RunForecastResponse } from "@/lib/types/analytics"
import type { PaginatedResponse } from "@/lib/types/product"

const MAX_PAGE_SIZE = 500

export async function listForecasts(token: string, productId: number | null) {
  const params = new URLSearchParams({ page_size: String(MAX_PAGE_SIZE) })
  if (productId !== null) params.set("product_id", String(productId))
  const page = await apiFetch<PaginatedResponse<ForecastResult>>(`/api/forecasting/results/?${params}`, { token })
  return page.results
}

export function runForecast(token: string) {
  return apiFetch<RunForecastResponse>("/api/forecasting/results/run/", {
    method: "POST",
    token,
  })
}
