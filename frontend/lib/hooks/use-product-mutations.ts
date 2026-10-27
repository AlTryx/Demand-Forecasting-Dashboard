"use client"

import { useCallback, useState } from "react"
import {
  createProduct,
  deleteProduct,
  updateProduct,
} from "@/lib/api/products-service"
import { getAccessToken } from "@/lib/auth/tokens"
import type { Product, ProductInput, ProductUpdate } from "@/lib/types/product"

export type ProductMutationState = {
  loading: boolean
  error: Error | null
  mutateCreate: (payload: ProductInput) => Promise<Product>
  mutateUpdate: (id: number, payload: ProductUpdate) => Promise<Product>
  mutateDelete: (id: number) => Promise<void>
}

export function useProductMutations(): ProductMutationState {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const runWithToken = useCallback(async <T>(action: (token: string) => Promise<T>) => {
    const token = getAccessToken()
    if (!token) {
      throw new Error("Not authenticated")
    }

    setLoading(true)
    setError(null)

    try {
      return await action(token)
    } catch (err) {
      const nextError = err instanceof Error ? err : new Error("Unknown error")
      setError(nextError)
      throw nextError
    } finally {
      setLoading(false)
    }
  }, [])

  const mutateCreate = useCallback(
    async (payload: ProductInput) => runWithToken((token) => createProduct(payload, token)),
    [runWithToken],
  )

  const mutateUpdate = useCallback(
    async (id: number, payload: ProductUpdate) =>
      runWithToken((token) => updateProduct(id, payload, token)),
    [runWithToken],
  )

  const mutateDelete = useCallback(
    async (id: number) => runWithToken((token) => deleteProduct(id, token)),
    [runWithToken],
  )

  return {
    loading,
    error,
    mutateCreate,
    mutateUpdate,
    mutateDelete,
  }
}
