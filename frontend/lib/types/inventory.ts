export type InventoryStatus = "UNKNOWN" | "STOCKOUT_RISK" | "OVERSTOCK" | "OK"

export type InventoryItem = {
  id: number
  product_name: string
  stock_keeping_unit: string | null
  days_of_stock_left: number
  status: InventoryStatus
  recommended_reorder_quantity: number
}
