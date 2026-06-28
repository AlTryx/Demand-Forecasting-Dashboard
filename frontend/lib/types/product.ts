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

export type PaginatedResponse<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
