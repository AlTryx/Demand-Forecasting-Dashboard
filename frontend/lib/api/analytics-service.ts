import { apiFetch } from "@/lib/api/client"
import type {
  SalesSummary,
  SalesTimeline,
  TopProducts,
  TopProductsOrder,
} from "@/lib/types/analytics"

function query(params: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ""
}

export function getSalesSummary(token: string, productId: number | null) {
  return apiFetch<SalesSummary>(
    `/api/analytics/summary/${query({ product_id: productId })}`,
    { token },
  )
}

export function getSalesTimeline(token: string, productId: number | null, weeks = 12) {
  return apiFetch<SalesTimeline>(
    `/api/analytics/timeline/${query({ product_id: productId, weeks })}`,
    { token },
  )
}

export type TopProductsOptions = {
  limit: number
  weeks?: number
  orderBy?: TopProductsOrder
}

export function getTopProducts(token: string, { limit, weeks, orderBy = "revenue" }: TopProductsOptions) {
  return apiFetch<TopProducts>(
    `/api/analytics/top-products/${query({ limit, weeks, order_by: orderBy })}`,
    { token },
  )
}
