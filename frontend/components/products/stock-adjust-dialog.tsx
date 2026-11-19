"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Boxes } from "lucide-react"
import { Modal } from "@/components/dashboard/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { Product, StockAdjustment, StockDirection, StockReason } from "@/lib/types/product"

const REASONS: Record<StockDirection, { value: StockReason; label: string }[]> = {
  increase: [
    { value: "RESTOCK", label: "Supplier delivery" },
    { value: "CORRECTION", label: "Stock count correction" },
  ],
  decrease: [
    { value: "WASTE", label: "Damaged or expired" },
    { value: "CORRECTION", label: "Stock count correction" },
  ],
}

type StockAdjustDialogProps = {
  product: Product | null
  submitting: boolean
  error: string | null
  onClose: () => void
  onSubmit: (product: Product, adjustment: StockAdjustment) => Promise<void>
}

export function StockAdjustDialog({ product, submitting, error, onClose, onSubmit }: StockAdjustDialogProps) {
  const [direction, setDirection] = useState<StockDirection>("increase")
  const [reason, setReason] = useState<StockReason>("RESTOCK")
  const [amount, setAmount] = useState("")

  useEffect(() => {
    if (product) {
      setDirection("increase")
      setReason("RESTOCK")
      setAmount("")
    }
  }, [product])

  const chooseDirection = (next: StockDirection) => {
    setDirection(next)
    setReason(REASONS[next][0].value)
  }

  const quantity = Number.parseInt(amount, 10)
  const validQuantity = Number.isInteger(quantity) && quantity > 0
  const current = product?.current_stock ?? 0
  const nextStock = validQuantity ? current + (direction === "increase" ? quantity : -quantity) : null
  const tooMuch = nextStock !== null && nextStock < 0

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!product || !validQuantity || tooMuch) return
    await onSubmit(product, { direction, amount: quantity, reason })
  }

  return (
    <Modal
      open={product !== null}
      onClose={submitting ? () => undefined : onClose}
      title="Adjust stock"
      description={product ? `${product.name} · ${current} in stock` : undefined}
      icon={<Boxes className="size-5" />}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Direction">
          {(["increase", "decrease"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={direction === option}
              onClick={() => chooseDirection(option)}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                direction === option
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-secondary",
              )}
            >
              {option === "increase" ? "Add stock" : "Remove stock"}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="stock-reason" className="text-muted-foreground">
            Reason
          </Label>
          <select
            id="stock-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value as StockReason)}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            {REASONS[direction].map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="stock-amount" className="text-muted-foreground">
            Quantity
          </Label>
          <Input
            id="stock-amount"
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={tooMuch || undefined}
            required
            autoFocus
          />
          <p className={cn("text-xs", tooMuch ? "text-destructive" : "text-muted-foreground")}>
            {nextStock === null
              ? "Enter how many units to add or remove."
              : tooMuch
                ? `Only ${current} in stock, so you can remove at most ${current}.`
                : `Stock goes from ${current} to ${nextStock}.`}
          </p>
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !validQuantity || tooMuch}>
            {submitting ? "Saving…" : "Save adjustment"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
