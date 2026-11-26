"use client"

import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Product, ProductInput } from "@/lib/types/product"

type FormState = {
  name: string
  category: string
  price: string
  current_stock: string
  stock_keeping_unit: string
}

const EMPTY_FORM: FormState = {
  name: "",
  category: "",
  price: "",
  current_stock: "0",
  stock_keeping_unit: "",
}

type ProductFormProps = {
  mode: "create" | "edit"
  initialValue?: Product | null
  submitting?: boolean
  error?: string | null
  onSubmit: (payload: ProductInput) => Promise<void> | void
  onCancel: () => void
}

export function ProductForm({
  mode,
  initialValue,
  submitting = false,
  error,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  useEffect(() => {
    setForm(
      initialValue
        ? {
            name: initialValue.name,
            category: initialValue.category,
            price: initialValue.price,
            current_stock: String(initialValue.current_stock),
            stock_keeping_unit: initialValue.stock_keeping_unit ?? "",
          }
        : EMPTY_FORM,
    )
  }, [initialValue])

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSubmit({
      name: form.name.trim(),
      category: form.category.trim(),
      price: form.price.trim(),
      current_stock: Number.parseInt(form.current_stock, 10) || 0,
      stock_keeping_unit: form.stock_keeping_unit.trim() || null,
    })
  }

  const isEdit = mode === "edit"

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold">{isEdit ? `Edit ${initialValue?.name ?? "product"}` : "New product"}</h2>
        {!isEdit && <p className="text-xs text-muted-foreground">Fields marked * are required</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="product-name" label="Name *">
          <Input
            id="product-name"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            maxLength={255}
            required
            autoFocus
          />
        </Field>

        <Field id="product-sku" label="SKU">
          <Input
            id="product-sku"
            value={form.stock_keeping_unit}
            onChange={(e) => updateField("stock_keeping_unit", e.target.value)}
            maxLength={50}
            placeholder="Optional"
          />
        </Field>

        <Field id="product-category" label="Category *">
          <Input
            id="product-category"
            value={form.category}
            onChange={(e) => updateField("category", e.target.value)}
            maxLength={20}
            required
          />
        </Field>

        <Field id="product-price" label="Price (€) *">
          <Input
            id="product-price"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={form.price}
            onChange={(e) => updateField("price", e.target.value)}
            required
          />
        </Field>

        <Field
          id="product-stock"
          label={isEdit ? "Stock on hand" : "Opening stock *"}
          hint={isEdit ? "Use Adjust stock so every change is recorded with a reason." : undefined}
        >
          <Input
            id="product-stock"
            type="number"
            inputMode="numeric"
            step="1"
            min="0"
            value={form.current_stock}
            onChange={(e) => updateField("current_stock", e.target.value)}
            disabled={isEdit}
            required={!isEdit}
          />
        </Field>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? (isEdit ? "Saving…" : "Creating…") : isEdit ? "Save changes" : "Create product"}
        </Button>
      </div>
    </form>
  )
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
