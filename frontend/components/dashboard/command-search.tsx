"use client"

import { useEffect, useState } from "react"
import { Loader2, Search, X } from "lucide-react"
import { searchProducts } from "@/lib/api/products-service"
import { getAccessToken } from "@/lib/auth/tokens"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import { formatNumber } from "@/lib/format"
import type { ProductRef } from "@/lib/types/analytics"
import { cn } from "@/lib/utils"

type CommandSearchProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSelect: (product: ProductRef) => void
    suggestions: ProductRef[]
}

type SearchResult = {
    items: ProductRef[]
    total: number
}

export function CommandSearch({ open, onOpenChange, onSelect, suggestions }: CommandSearchProps) {
    const [search, setSearch] = useState("")
    const [highlightedIndex, setHighlightedIndex] = useState(0)
    const [result, setResult] = useState<SearchResult | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const query = useDebouncedValue(search.trim(), 250)
    const items = query ? result?.items ?? [] : suggestions

    useEffect(() => {
        if (!query) {
            setResult(null)
            setError("")
            return
        }
        const token = getAccessToken()
        if (!token) return

        let active = true
        setLoading(true)
        setError("")
        searchProducts(query, token)
            .then((page) => {
                if (!active) return
                setResult({
                    total: page.count,
                    items: page.results.map((p) => ({ id: p.id, name: p.name, sku: p.stock_keeping_unit ?? null })),
                })
                setHighlightedIndex(0)
            })
            .catch(() => active && setError("Search failed. Try again."))
            .finally(() => active && setLoading(false))

        return () => {
            active = false
        }
    }, [query])

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                onOpenChange(!open)
                return
            }
            if (!open) return

            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault()
                    if (items.length) setHighlightedIndex((i) => (i + 1) % items.length)
                    break
                case "ArrowUp":
                    e.preventDefault()
                    if (items.length) setHighlightedIndex((i) => (i - 1 + items.length) % items.length)
                    break
                case "Enter":
                    e.preventDefault()
                    if (items[highlightedIndex]) handleSelect(items[highlightedIndex])
                    break
                case "Escape":
                    e.preventDefault()
                    close()
                    break
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    })

    const close = () => {
        onOpenChange(false)
        setSearch("")
        setHighlightedIndex(0)
    }

    const handleSelect = (product: ProductRef) => {
        onSelect(product)
        close()
    }

    const pending = loading || search.trim() !== query

    return (
        <>
            <div className="hidden items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground md:flex cursor-pointer hover:border-primary transition-colors"
                onClick={() => onOpenChange(true)}
            >
                <Search className="size-4" aria-hidden="true" />
                <span className="text-xs">Search products...</span>
                <span className="ml-auto text-xs font-mono bg-secondary px-1.5 py-0.5 rounded">
                    ⌘K
                </span>
            </div>
            <button
                type="button"
                onClick={() => onOpenChange(true)}
                className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-secondary md:hidden"
                aria-label="Search products"
            >
                <Search className="size-5" />
            </button>

            {open && (
                <>
                    <div
                        className="fixed inset-0 z-50 bg-black/50"
                        onClick={close}
                        aria-hidden="true"
                    />
                    <div className="fixed left-1/2 top-1/4 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg border border-border bg-card shadow-lg">
                        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                            {pending && search.trim() !== "" ? (
                                <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
                            ) : (
                                <Search className="size-4 text-muted-foreground" aria-hidden="true" />
                            )}
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
                                onClick={close}
                                className="text-muted-foreground hover:text-foreground"
                                aria-label="Close"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        {!query && suggestions.length > 0 && (
                            <p className="px-4 pt-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                                Top products
                            </p>
                        )}

                        <div className="max-h-80 overflow-y-auto">
                            {error ? (
                                <div className="px-4 py-6 text-center text-sm text-destructive">{error}</div>
                            ) : items.length === 0 ? (
                                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                                    {query && !pending ? "No products found" : query ? "Searching…" : "Type to search all products"}
                                </div>
                            ) : (
                                <ul className="divide-y divide-border">
                                    {items.map((product, idx) => (
                                        <li key={product.id}>
                                            <button
                                                type="button"
                                                onClick={() => handleSelect(product)}
                                                onMouseEnter={() => setHighlightedIndex(idx)}
                                                className={cn(
                                                    "w-full px-4 py-3 text-left text-sm transition-colors",
                                                    highlightedIndex === idx
                                                        ? "bg-primary/10 text-primary"
                                                        : "text-foreground hover:bg-secondary"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                                                        {product.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate font-medium">{product.name}</p>
                                                        {product.sku && (
                                                            <p className="text-xs text-muted-foreground">{product.sku}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
                            <span>
                                <span className="inline-block px-1.5 py-0.5 rounded bg-secondary mr-1">↑↓</span>
                                Navigate
                                <span className="inline-block px-1.5 py-0.5 rounded bg-secondary mr-1 ml-3">⏎</span>
                                Select
                            </span>
                            {query && result && result.total > result.items.length && (
                                <span>
                                    {result.items.length} of {formatNumber(result.total)} · keep typing
                                </span>
                            )}
                        </div>
                    </div>
                </>
            )}
        </>
    )
}
