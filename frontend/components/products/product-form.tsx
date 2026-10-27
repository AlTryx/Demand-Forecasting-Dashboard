"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import type { Product, ProductInput } from "@/lib/types/product"

const EMPTY_FORM: ProductInput = {
  name: "",
  category: "",
  price: "",
  current_stock: 0,
}

type ProductFormProps = {
  mode: "create" | "edit"
  initialValue?: Product | null
  submitting?: boolean
  onSubmit: (payload: ProductInput) => Promise<void> | void
  onCancel?: () => void
}

export function ProductForm({
  mode,
  initialValue,
  submitting = false,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const [form, setForm] = useState<ProductInput>(EMPTY_FORM)

  useEffect(() => {
    if (initialValue) {
      setForm({
        name: initialValue.name,
        category: initialValue.category,
        price: initialValue.price,
        current_stock: initialValue.current_stock,
      })
      return
    }

    setForm(EMPTY_FORM)
  }, [initialValue])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSubmit({
      ...form,
      price: form.price === "" ? 0 : Number(form.price),
      current_stock: Number(form.current_stock),
    })
  }

  const updateField = <K extends keyof ProductInput>(field: K, value: ProductInput[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="text-muted-foreground">Name</span>
          <input
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            required
            className="w-full rounded-md border bg-background px-3 py-2"
          />
        </label>

        <label className="space-y-2 text-sm">
          <span className="text-muted-foreground">Category</span>
          <input
            value={form.category}
            onChange={(e) => updateField("category", e.target.value)}
            required
            className="w-full rounded-md border bg-background px-3 py-2"
          />
        </label>

        <label className="space-y-2 text-sm">
          <span className="text-muted-foreground">Price</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.price}
            onChange={(e) => updateField("price", e.target.value)}
            required
            className="w-full rounded-md border bg-background px-3 py-2"
          />
        </label>

        <label className="space-y-2 text-sm">
          <span className="text-muted-foreground">Current stock</span>
          <input
            type="number"
            min="0"
            value={form.current_stock}
            onChange={(e) => updateField("current_stock", Number(e.target.value))}
            required
            className="w-full rounded-md border bg-background px-3 py-2"
          />
        </label>
      </div>

      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? (mode === "create" ? "Creating..." : "Saving...") : mode === "create" ? "Create product" : "Save changes"}
        </Button>
      </div>
    </form>
  )
}
