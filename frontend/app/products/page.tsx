"use client"

import { useCallback, useEffect, useState } from "react"
import { RequireAuth, RequireBusiness } from "@/components/auth/route-guard"
import { ProductForm } from "@/components/products/product-form"
import { ProductList } from "@/components/products/product-list"
import { useProductMutations } from "@/lib/hooks/use-product-mutations"
import { useProducts } from "@/lib/hooks/use-products"
import type { Product, ProductInput } from "@/lib/types/product"

export default function ProductsPage() {
  const { data, loading, error, refetch } = useProducts(1)
  const { mutateCreate, mutateUpdate, mutateDelete, loading: mutating } = useProductMutations()
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const handleCreate = useCallback(
    async (payload: ProductInput) => {
      await mutateCreate(payload)
      setEditingProduct(null)
      refetch()
    },
    [mutateCreate, refetch],
  )

  const handleUpdate = useCallback(
    async (payload: ProductInput) => {
      if (!editingProduct) return
      await mutateUpdate(editingProduct.id, payload)
      setEditingProduct(null)
      refetch()
    },
    [editingProduct, mutateUpdate, refetch],
  )

  const handleDelete = useCallback(
    async (id: number) => {
      await mutateDelete(id)
      refetch()
    },
    [mutateDelete, refetch],
  )

  const handleSubmit = useCallback(
    async (payload: ProductInput) => {
      if (editingProduct) {
        await handleUpdate(payload)
        return
      }

      await handleCreate(payload)
    },
    [editingProduct, handleCreate, handleUpdate],
  )

  return (
    <RequireAuth>
      <RequireBusiness>
        <main className="mx-auto max-w-6xl space-y-8 p-6">
          <header className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Catalog</p>
              <h1 className="text-3xl font-bold">Products</h1>
            </div>
          </header>

          {error && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              {error.message}
            </div>
          )}

          <ProductForm
            mode={editingProduct ? "edit" : "create"}
            initialValue={editingProduct}
            submitting={mutating}
            onSubmit={handleSubmit}
            onCancel={editingProduct ? () => setEditingProduct(null) : undefined}
          />

          <ProductList
            products={data?.results ?? []}
            loading={loading || mutating}
            onEdit={setEditingProduct}
            onDelete={handleDelete}
          />
        </main>
      </RequireBusiness>
    </RequireAuth>
  )
}
