"use client"

import { useCallback } from "react"
import { listInventory } from "@/lib/api/inventory-service"
import { useApiData } from "./use-api-data"
import type { PaginatedResponse } from "@/lib/types/product"
import type { InventoryItem } from "@/lib/types/inventory"

export function useInventory(page = 1) {
  const fetcher = useCallback(
    (token: string) => listInventory(token, page),
    [page],
  )
  return useApiData<PaginatedResponse<InventoryItem>>(fetcher)
}
