import { apiFetch } from "@/lib/api/client"
import type { ForecastResult, RunForecastResponse } from "@/lib/types/analytics"

export function listForecasts(token: string, productId: number | null) {
  const qs = productId === null ? "" : `?product_id=${productId}`
  return apiFetch<ForecastResult[]>(`/api/forecasting/results/${qs}`, { token })
}

export function runForecast(token: string) {
  return apiFetch<RunForecastResponse>("/api/forecasting/results/run/", {
    method: "POST",
    token,
  })
}
