"use client"

import { useEffect, useState } from "react"
import { Search, X } from "lucide-react"
import { products } from "@/lib/forecast-data"
import { cn } from "@/lib/utils"

type CommandSearchProps = {
    onSelect: (productId: string) => void
}

export function CommandSearch({ onSelect }: CommandSearchProps) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState("")
    const [highlightedIndex, setHighlightedIndex] = useState(0)

    const filtered = products.filter(
        (p) =>
            p.label.toLowerCase().includes(search.toLowerCase()) ||
            p.sku.toLowerCase().includes(search.toLowerCase())
    )

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }

            if (!open) return

            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault()
                    setHighlightedIndex((i) => (i + 1) % filtered.length)
                    break
                case "ArrowUp":
                    e.preventDefault()
                    setHighlightedIndex((i) => (i - 1 + filtered.length) % filtered.length)
                    break
                case "Enter":
                    e.preventDefault()
                    if (filtered[highlightedIndex]) {
                        handleSelect(filtered[highlightedIndex].id)
                    }
                    break
                case "Escape":
                    e.preventDefault()
                    setOpen(false)
                    break
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [open, filtered, highlightedIndex])

    const handleSelect = (productId: string) => {
        onSelect(productId)
        setOpen(false)
        setSearch("")
    }

    return (
        <>
            {/* Keyboard shortcut hint + button */}
            <div className="hidden items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground md:flex cursor-pointer hover:border-primary transition-colors"
                onClick={() => setOpen(true)}
            >
                <Search className="size-4" aria-hidden="true" />
                <span className="text-xs">Quick search...</span>
                <span className="ml-auto text-xs font-mono bg-secondary px-1.5 py-0.5 rounded">
                    ⌘K
                </span>
            </div>

            {/* Command overlay */}
            {open && (
                <>
                    <div
                        className="fixed inset-0 z-50 bg-black/50"
                        onClick={() => setOpen(false)}
                        aria-hidden="true"
                    />
                    <div className="fixed left-1/2 top-1/4 z-50 w-full max-w-md -translate-x-1/2 rounded-lg border border-border bg-card shadow-lg">
                        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                            <Search className="size-4 text-muted-foreground" aria-hidden="true" />
                            <input
                                type="text"
                                placeholder="Search products by name or SKU..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value)
                                    setHighlightedIndex(0)
                                }}
                                autoFocus
                                className="w-full flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
                            />
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="text-muted-foreground hover:text-foreground"
                                aria-label="Close"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        <div className="max-h-80 overflow-y-auto">
                            {filtered.length === 0 ? (
                                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                                    No products found
                                </div>
                            ) : (
                                <ul className="divide-y divide-border">
                                    {filtered.map((product, idx) => (
                                        <li key={product.id}>
                                            <button
                                                type="button"
                                                onClick={() => handleSelect(product.id)}
                                                className={cn(
                                                    "w-full px-4 py-3 text-left text-sm transition-colors",
                                                    highlightedIndex === idx
                                                        ? "bg-primary/10 text-primary"
                                                        : "text-foreground hover:bg-secondary"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                                                        {product.label.charAt(0)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-medium">{product.label}</p>
                                                        <p className="text-xs text-muted-foreground">{product.sku}</p>
                                                    </div>
                                                </div>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
                            <span className="inline-block px-1.5 py-0.5 rounded bg-secondary mr-1">
                                ↑↓
                            </span>
                            Navigate
                            <span className="inline-block px-1.5 py-0.5 rounded bg-secondary mr-1 ml-3">
                                ⏎
                            </span>
                            Select
                        </div>
                    </div>
                </>
            )}
        </>
    )
}
