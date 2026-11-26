"use client"

import { useCallback } from "react"
import { listProducts, searchProducts } from "@/lib/api/products-service"
import { useApiData } from "./use-api-data"
import type { PaginatedResponse, Product } from "@/lib/types/product"

export function useProducts(page = 1, query = "") {
  const trimmed = query.trim()
  const fetcher = useCallback(
    (token: string) => (trimmed ? searchProducts(trimmed, token, page) : listProducts(token, page)),
    [page, trimmed],
  )
  return useApiData<PaginatedResponse<Product>>(fetcher)
}
