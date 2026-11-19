"use client"

import { useState, type ReactNode } from "react"
import { PackageOpen, SearchX } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatPriceEUR } from "@/lib/format"
import type { Product } from "@/lib/types/product"

const LOW_STOCK = 10

type ProductListProps = {
  products: Product[]
  loading: boolean
  query: string
  busyId: number | null
  onCreate: () => void
  onEdit: (product: Product) => void
  onAdjust: (product: Product) => void
  onDelete: (product: Product) => Promise<void>
}

export function ProductList({
  products,
  loading,
  query,
  busyId,
  onCreate,
  onEdit,
  onAdjust,
  onDelete,
}: ProductListProps) {
  const [confirmingId, setConfirmingId] = useState<number | null>(null)

  if (loading) {
    return (
      <div className="space-y-2 rounded-xl border p-4" aria-busy="true" aria-label="Loading products">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-9 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return query.trim() ? (
      <EmptyState icon={<SearchX className="size-6" />} title={`No products match “${query.trim()}”`}>
        Try a different name or SKU.
      </EmptyState>
    ) : (
      <EmptyState icon={<PackageOpen className="size-6" />} title="No products yet">
        Add your first product here, or import your sales history as CSV from the dashboard.
        <Button type="button" className="mt-4" onClick={onCreate}>
          Add product
        </Button>
      </EmptyState>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 text-right font-medium">Price</th>
            <th className="px-4 py-3 text-right font-medium">Stock</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const busy = busyId === product.id
            const confirming = confirmingId === product.id
            return (
              <tr key={product.id} className="border-t">
                <td className="px-4 py-3">
                  <div className="font-medium">{product.name}</div>
                  {product.stock_keeping_unit && (
                    <div className="text-xs text-muted-foreground">{product.stock_keeping_unit}</div>
                  )}
                </td>
                <td className="px-4 py-3">{product.category}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatPriceEUR(Number(product.price))}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <StockBadge stock={product.current_stock} />
                    <span className="tabular-nums">{product.current_stock}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {confirming ? (
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-xs text-muted-foreground">Delete {product.name}?</span>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={busy}
                        onClick={async () => {
                          await onDelete(product)
                          setConfirmingId(null)
                        }}
                      >
                        {busy ? "Deleting…" : "Delete"}
                      </Button>
                      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setConfirmingId(null)}>
                        Keep
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => onAdjust(product)}>
                        Adjust stock
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => onEdit(product)}>
                        Edit
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingId(product.id)}>
                        Delete
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) return <Badge variant="destructive">Out of stock</Badge>
  if (stock <= LOW_STOCK) return <Badge variant="secondary">Low</Badge>
  return null
}

function EmptyState({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center">
      <div className="rounded-full bg-secondary p-3 text-muted-foreground">{icon}</div>
      <h2 className="mt-3 text-base font-semibold">{title}</h2>
      <div className="mt-1 flex max-w-sm flex-col items-center text-sm text-muted-foreground">{children}</div>
    </div>
  )
}
