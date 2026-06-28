import { apiFetch } from "@/lib/api/client"
import type { PaginatedResponse, Product } from "@/lib/types/product"

export function listProducts(token: string, page = 1) {
  return apiFetch<PaginatedResponse<Product>>(`/api/products/?page=${page}`, { token })
}

export function getProduct(id: number, token: string) {
  return apiFetch<Product>(`/api/products/${id}/`, { token })
}

export function createProduct(
  data: Pick<Product, "name" | "category" | "price" | "current_stock">,
  token: string,
) {
  return apiFetch<Product>("/api/products/", { method: "POST", body: data, token })
}

export function updateProduct(id: number, data: Partial<Pick<Product, "name" | "category" | "price" | "current_stock">>, token: string) {
  return apiFetch<Product>(`/api/products/${id}/`, { method: "PATCH", body: data, token })
}

export function deleteProduct(id: number, token: string) {
  return apiFetch<void>(`/api/products/${id}/`, { method: "DELETE", token })
}

export function searchProducts(query: string, token: string) {
  return apiFetch<PaginatedResponse<Product>>(
    `/api/products/search/?q=${encodeURIComponent(query)}`,
    { token },
  )
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

export function increaseStock(id: number, amount: number, token: string) {
  return apiFetch<Product>(`/api/products/${id}/increase_stock/`, {
    method: "POST",
    body: { amount },
    token,
  })
}

export function decreaseStock(id: number, amount: number, token: string) {
  return apiFetch<Product>(`/api/products/${id}/decrease_stock/`, {
    method: "POST",
    body: { amount },
    token,
  })
}
