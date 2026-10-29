"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import type { Product } from "@/lib/types/product"

type ProductListProps = {
  products: Product[]
  loading: boolean
  onEdit: (product: Product) => void
  onDelete: (id: number) => Promise<void> | void
}

export function ProductList({ products, loading, onEdit, onDelete }: ProductListProps) {
  const rows = useMemo(() => products, [products])

  if (loading) {
    return <div className="rounded-xl border p-6 text-sm text-muted-foreground">Loading products...</div>
  }

  if (!rows.length) {
    return <div className="rounded-xl border p-6 text-sm text-muted-foreground">No products yet.</div>
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">Price</th>
            <th className="px-4 py-3 font-medium">Stock</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((product) => (
            <tr key={product.id} className="border-t">
              <td className="px-4 py-3">{product.name}</td>
              <td className="px-4 py-3">{product.category}</td>
              <td className="px-4 py-3">€{Number(product.price).toFixed(2)}</td>
              <td className="px-4 py-3">{product.current_stock}</td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => onEdit(product)}>
                    Edit
                  </Button>
                  <Button type="button" variant="destructive" size="sm" onClick={() => onDelete(product.id)}>
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
