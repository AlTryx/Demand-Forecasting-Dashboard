import { apiFetch } from "@/lib/api/client"
import type { InventoryItem } from "@/lib/types/inventory"
import type { PaginatedResponse } from "@/lib/types/product"

export function listInventory(token: string, page = 1) {
  return apiFetch<PaginatedResponse<InventoryItem>>(
    `/api/inventory/results/?page=${page}`,
    { token },
  )
}

export function getInventoryItem(id: number, token: string) {
  return apiFetch<InventoryItem>(`/api/inventory/results/${id}/`, { token })
}
