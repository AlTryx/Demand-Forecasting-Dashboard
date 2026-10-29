export type Product = {
  id: number
  name: string
  category: string
  price: string
  current_stock: number
  business: number
  created_at: string
  updated_at: string
}

export type ProductInput = {
  name: string
  category: string
  price: number | string
  current_stock: number
}

export type ProductUpdate = Partial<ProductInput>

export type PaginatedResponse<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
