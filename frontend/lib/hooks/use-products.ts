"use client"

import { useCallback } from "react"
import { listProducts } from "@/lib/api/products-service"
import { useApiData } from "./use-api-data"
import type { PaginatedResponse } from "@/lib/types/product"
import type { Product } from "@/lib/types/product"

export function useProducts(page = 1) {
  const fetcher = useCallback(
    (token: string) => listProducts(token, page),
    [page],
  )
  return useApiData<PaginatedResponse<Product>>(fetcher)
}
