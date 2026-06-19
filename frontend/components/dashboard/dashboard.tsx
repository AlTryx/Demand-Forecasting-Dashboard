"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut, Menu } from "lucide-react"
import { useAuth } from "@/lib/auth/auth-context"
import {
  getDemandShare,
  getForecastLog,
  getProductContext,
  getTimeline,
  getVolatility,
  products,
} from "@/lib/forecast-data"
import { Sidebar } from "./sidebar"
import { KpiCards } from "./kpi-cards"
import { TimelineChart } from "./timeline-chart"
import { ForecastTable } from "./forecast-table"
import { CommandSearch } from "./command-search"
import ForecastAnalyticsGrid from "./forecast-analytics-grid"
import ProductContextPanel from "./product-context-panel"

export function Dashboard() {
  const router = useRouter()
  const { logout } = useAuth()
  const [selected, setSelected] = useState("overview")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.replace("/signin")
  }

  const product = useMemo(
    () => products.find((p) => p.id === selected) ?? products[0],
    [selected],
  )
  const timeline = useMemo(() => getTimeline(selected), [selected])
  const log = useMemo(() => getForecastLog(selected), [selected])
  const shareData = useMemo(() => getDemandShare(), [])
  const volatilityData = useMemo(() => getVolatility(), [])
  const context = useMemo(() => getProductContext(selected), [selected])

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar
        selected={selected}
        onSelect={setSelected}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-card/60 px-6 backdrop-blur">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile menu button */}
            <button
              type="button"
              className="mr-2 inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-secondary md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>

            <h1 className="truncate text-lg font-semibold tracking-tight">
              {product.label}
            </h1>
            <span className="hidden rounded-md bg-secondary px-2 py-0.5 font-mono text-xs text-secondary-foreground sm:inline">
              {product.sku}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <CommandSearch onSelect={setSelected} />
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Log out"
            >
              <LogOut className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Log out</span>
            </button>
            <div className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              DF
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-8">
            <div>
              <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Demand Forecasting
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-balance">
                Executive Overview
              </h2>
            </div>

            <KpiCards product={product} />
            <TimelineChart data={timeline} />
            <ForecastAnalyticsGrid
              shareData={shareData}
              volatilityData={volatilityData}
            />
            <ProductContextPanel
              context={context}
              isOverview={selected === "overview"}
              productCount={products.length - 1}
            />
            <ForecastTable rows={log} />
          </div>
        </main>
      </div>
    </div>
  )
}
