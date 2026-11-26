import { apiFetch } from "@/lib/api/client"
import type {
  PaginatedResponse,
  Product,
  ProductInput,
  ProductUpdate,
  StockAdjustment,
} from "@/lib/types/product"

export function listProducts(token: string, page = 1) {
  return apiFetch<PaginatedResponse<Product>>(`/api/products/?page=${page}`, { token })
}

export function searchProducts(query: string, token: string, page = 1) {
  const params = new URLSearchParams({ q: query, page: String(page) })
  return apiFetch<PaginatedResponse<Product>>(`/api/products/search/?${params}`, { token })
}

export function getProduct(id: number, token: string) {
  return apiFetch<Product>(`/api/products/${id}/`, { token })
}

export function createProduct(data: ProductInput, token: string) {
  return apiFetch<Product>("/api/products/", { method: "POST", body: data, token })
}

export function updateProduct(id: number, data: ProductUpdate, token: string) {
  return apiFetch<Product>(`/api/products/${id}/`, { method: "PATCH", body: data, token })
}

export function deleteProduct(id: number, token: string) {
  return apiFetch<void>(`/api/products/${id}/`, { method: "DELETE", token })
}

export function adjustStock(id: number, { direction, amount, reason }: StockAdjustment, token: string) {
  return apiFetch<Product>(`/api/products/${id}/${direction}_stock/`, {
    method: "POST",
    body: { amount, reason },
    token,
  })
}

export function getLowStockProducts(token: string, threshold = 10) {
  return apiFetch<PaginatedResponse<Product>>(
    `/api/products/low_stock/?threshold=${threshold}`,
    { token },
  )
}

export function getOutOfStockProducts(token: string) {
  return apiFetch<PaginatedResponse<Product>>("/api/products/out_of_stock/", { token })
}
