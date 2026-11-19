"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Search } from "lucide-react"
import { RequireAuth, RequireBusiness } from "@/components/auth/route-guard"
import { ProductForm } from "@/components/products/product-form"
import { ProductList } from "@/components/products/product-list"
import { StockAdjustDialog } from "@/components/products/stock-adjust-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { describeError } from "@/lib/api/errors"
import { formatNumber } from "@/lib/format"
import { useProductMutations } from "@/lib/hooks/use-product-mutations"
import { useProducts } from "@/lib/hooks/use-products"
import type { Product, ProductInput, StockAdjustment } from "@/lib/types/product"

const PAGE_SIZE = 20
const SEARCH_DELAY_MS = 300

type FormState = { mode: "create" } | { mode: "edit"; product: Product } | null
type Notice = { kind: "success" | "error"; text: string } | null

export default function ProductsPage() {
  const [searchInput, setSearchInput] = useState("")
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [form, setForm] = useState<FormState>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [adjusting, setAdjusting] = useState<Product | null>(null)
  const [adjustError, setAdjustError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [notice, setNotice] = useState<Notice>(null)

  const { data, loading, error, refetch } = useProducts(page, query)
  const { mutateCreate, mutateUpdate, mutateDelete, mutateAdjustStock, loading: mutating } = useProductMutations()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(searchInput)
      setPage(1)
    }, SEARCH_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    if (notice?.kind !== "success") return
    const timer = window.setTimeout(() => setNotice(null), 4000)
    return () => window.clearTimeout(timer)
  }, [notice])

  const openCreate = useCallback(() => {
    setFormError(null)
    setForm({ mode: "create" })
  }, [])

  const openEdit = useCallback((product: Product) => {
    setFormError(null)
    setForm({ mode: "edit", product })
  }, [])

  const closeForm = useCallback(() => {
    setFormError(null)
    setForm(null)
  }, [])

  const handleSubmit = useCallback(
    async (payload: ProductInput) => {
      if (!form) return
      setFormError(null)
      try {
        if (form.mode === "edit") {
          const { current_stock: _ignored, ...changes } = payload
          await mutateUpdate(form.product.id, changes)
          setNotice({ kind: "success", text: `Saved ${payload.name}.` })
        } else {
          await mutateCreate(payload)
          setNotice({ kind: "success", text: `Added ${payload.name}.` })
        }
        setForm(null)
        refetch()
      } catch (err) {
        setFormError(describeError(err))
      }
    },
    [form, mutateCreate, mutateUpdate, refetch],
  )

  const handleAdjust = useCallback(
    async (product: Product, adjustment: StockAdjustment) => {
      setAdjustError(null)
      try {
        const updated = await mutateAdjustStock(product.id, adjustment)
        setAdjusting(null)
        setNotice({ kind: "success", text: `${updated.name} now has ${formatNumber(updated.current_stock)} in stock.` })
        refetch()
      } catch (err) {
        setAdjustError(describeError(err))
      }
    },
    [mutateAdjustStock, refetch],
  )

  const handleDelete = useCallback(
    async (product: Product) => {
      setBusyId(product.id)
      try {
        await mutateDelete(product.id)
        setNotice({ kind: "success", text: `Deleted ${product.name}.` })
        if (data && data.results.length === 1 && page > 1) {
          setPage(page - 1)
        } else {
          refetch()
        }
      } catch (err) {
        setNotice({ kind: "error", text: `Could not delete ${product.name}: ${describeError(err)}` })
      } finally {
        setBusyId(null)
      }
    },
    [data, mutateDelete, page, refetch],
  )

  const firstItem = (page - 1) * PAGE_SIZE + 1
  const lastItem = data ? firstItem + data.results.length - 1 : 0

  return (
    <RequireAuth>
      <RequireBusiness>
        <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to dashboard
          </Link>

          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Catalog</p>
              <h1 className="text-3xl font-bold">Products</h1>
              {data && !query && (
                <p className="mt-1 text-sm text-muted-foreground">{formatNumber(data.count)} products</p>
              )}
            </div>
            {form === null && (
              <Button type="button" onClick={openCreate}>
                <Plus aria-hidden="true" />
                Add product
              </Button>
            )}
          </header>

          {notice && (
            <div
              role={notice.kind === "error" ? "alert" : "status"}
              className={
                notice.kind === "error"
                  ? "flex items-start justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
                  : "rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm text-primary"
              }
            >
              <span>{notice.text}</span>
              {notice.kind === "error" && (
                <button type="button" className="text-xs underline" onClick={() => setNotice(null)}>
                  Dismiss
                </button>
              )}
            </div>
          )}

          {form && (
            <ProductForm
              key={form.mode === "edit" ? form.product.id : "new"}
              mode={form.mode}
              initialValue={form.mode === "edit" ? form.product : null}
              submitting={mutating}
              error={formError}
              onSubmit={handleSubmit}
              onCancel={closeForm}
            />
          )}

          <div className="relative max-w-sm">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name or SKU"
              aria-label="Search products"
              className="pl-8"
            />
          </div>

          {error && !data ? (
            <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
              <p className="font-medium">Could not load products.</p>
              <p className="mt-1">{describeError(error)}</p>
              <Button type="button" variant="outline" size="sm" className="mt-3" onClick={refetch}>
                Try again
              </Button>
            </div>
          ) : (
            <>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  Could not refresh the list: {describeError(error)}
                </p>
              )}
              <ProductList
                products={data?.results ?? []}
                loading={loading && !data}
                query={query}
                busyId={busyId}
                onCreate={openCreate}
                onEdit={openEdit}
                onAdjust={(product) => {
                  setAdjustError(null)
                  setAdjusting(product)
                }}
                onDelete={handleDelete}
              />
            </>
          )}

          {data && data.count > PAGE_SIZE && (
            <nav className="flex items-center justify-between gap-3 text-sm" aria-label="Pagination">
              <span className="text-muted-foreground">
                {formatNumber(firstItem)}–{formatNumber(lastItem)} of {formatNumber(data.count)}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!data.previous || loading}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!data.next || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </nav>
          )}

          <StockAdjustDialog
            product={adjusting}
            submitting={mutating}
            error={adjustError}
            onClose={() => setAdjusting(null)}
            onSubmit={handleAdjust}
          />
        </main>
      </RequireBusiness>
    </RequireAuth>
  )
}
