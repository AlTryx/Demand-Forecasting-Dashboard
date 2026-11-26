export type Product = {
  id: number
  name: string
  category: string
  price: string
  current_stock: number
  stock_keeping_unit: string | null
  created_at: string
  updated_at: string
}

export type ProductInput = {
  name: string
  category: string
  price: string
  current_stock: number
  stock_keeping_unit: string | null
}

export type ProductUpdate = Partial<Omit<ProductInput, "current_stock">>

export type StockDirection = "increase" | "decrease"

export type StockReason = "RESTOCK" | "WASTE" | "CORRECTION"

export type StockAdjustment = {
  direction: StockDirection
  amount: number
  reason: StockReason
}

export type PaginatedResponse<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
