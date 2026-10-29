"use client"

import { useCallback } from "react"
import {
  getSalesSummary,
  getSalesTimeline,
  getTopProducts,
  type TopProductsOptions,
} from "@/lib/api/analytics-service"
import { listForecasts } from "@/lib/api/forecasting-service"
import type {
  ForecastResult,
  SalesSummary,
  SalesTimeline,
  TopProducts,
} from "@/lib/types/analytics"
import { useApiData } from "./use-api-data"

export function useSalesSummary(productId: number | null, version: number) {
  const fetcher = useCallback(
    (token: string) => getSalesSummary(token, productId),
    [productId, version],
  )
  return useApiData<SalesSummary>(fetcher)
}

export function useSalesTimeline(productId: number | null, version: number, weeks = 12) {
  const fetcher = useCallback(
    (token: string) => getSalesTimeline(token, productId, weeks),
    [productId, weeks, version],
  )
  return useApiData<SalesTimeline>(fetcher)
}

export function useTopProducts({ limit, weeks, orderBy }: TopProductsOptions, version: number) {
  const fetcher = useCallback(
    (token: string) => getTopProducts(token, { limit, weeks, orderBy }),
    [limit, weeks, orderBy, version],
  )
  return useApiData<TopProducts>(fetcher)
}

export function useForecasts(productId: number | null, version: number) {
  const fetcher = useCallback(
    (token: string) => listForecasts(token, productId),
    [productId, version],
  )
  return useApiData<ForecastResult[]>(fetcher)
}
