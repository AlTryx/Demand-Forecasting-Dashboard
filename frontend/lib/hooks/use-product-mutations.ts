"use client"

import { useCallback, useState } from "react"
import {
  adjustStock,
  createProduct,
  deleteProduct,
  updateProduct,
} from "@/lib/api/products-service"
import { getAccessToken } from "@/lib/auth/tokens"
import type { Product, ProductInput, ProductUpdate, StockAdjustment } from "@/lib/types/product"

export type ProductMutationState = {
  loading: boolean
  mutateCreate: (payload: ProductInput) => Promise<Product>
  mutateUpdate: (id: number, payload: ProductUpdate) => Promise<Product>
  mutateDelete: (id: number) => Promise<void>
  mutateAdjustStock: (id: number, adjustment: StockAdjustment) => Promise<Product>
}

export function useProductMutations(): ProductMutationState {
  const [loading, setLoading] = useState(false)

  const runWithToken = useCallback(async <T,>(action: (token: string) => Promise<T>) => {
    const token = getAccessToken()
    if (!token) {
      throw new Error("Not authenticated")
    }

    setLoading(true)
    try {
      return await action(token)
    } finally {
      setLoading(false)
    }
  }, [])

  const mutateCreate = useCallback(
    (payload: ProductInput) => runWithToken((token) => createProduct(payload, token)),
    [runWithToken],
  )

  const mutateUpdate = useCallback(
    (id: number, payload: ProductUpdate) => runWithToken((token) => updateProduct(id, payload, token)),
    [runWithToken],
  )

  const mutateDelete = useCallback(
    (id: number) => runWithToken((token) => deleteProduct(id, token)),
    [runWithToken],
  )

  const mutateAdjustStock = useCallback(
    (id: number, adjustment: StockAdjustment) => runWithToken((token) => adjustStock(id, adjustment, token)),
    [runWithToken],
  )

  return { loading, mutateCreate, mutateUpdate, mutateDelete, mutateAdjustStock }
}
