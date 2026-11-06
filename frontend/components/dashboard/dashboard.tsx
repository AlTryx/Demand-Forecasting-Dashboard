"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, LogOut, Menu } from "lucide-react"
import { useAuth } from "@/lib/auth/auth-context"
import {
  useForecasts,
  useSalesSummary,
  useSalesTimeline,
  useTopProducts,
} from "@/lib/hooks/use-dashboard-data"
import type { ProductRef } from "@/lib/types/analytics"
import { Sidebar } from "./sidebar"
import { KpiCards } from "./kpi-cards"
import { TimelineChart } from "./timeline-chart"
import { ForecastTable } from "./forecast-table"
import { CommandSearch } from "./command-search"
import ForecastAnalyticsGrid from "./forecast-analytics-grid"
import ProductContextPanel from "./product-context-panel"
import { CsvUploadCard } from "./csv-upload-card"
import { RunForecastButton } from "./run-forecast-button"

const SIDEBAR_PRODUCTS = 10
const SHARE_PRODUCTS = 5
const SHARE_WEEKS = 4
const TIMELINE_WEEKS = 12

export function Dashboard() {
  const router = useRouter()
  const { logout } = useAuth()
  const [selected, setSelected] = useState<ProductRef | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [version, setVersion] = useState(0)

  const selectedId = selected?.id ?? null
  const refresh = useCallback(() => setVersion((v) => v + 1), [])

  const overview = useSalesSummary(null, version)
  const summary = useSalesSummary(selectedId, version)
  const timeline = useSalesTimeline(selectedId, version, TIMELINE_WEEKS)
  const sidebarTop = useTopProducts({ limit: SIDEBAR_PRODUCTS, orderBy: "revenue" }, version)
  const shareTop = useTopProducts({ limit: SHARE_PRODUCTS, weeks: SHARE_WEEKS, orderBy: "units" }, version)
  const forecasts = useForecasts(selectedId, version)

  const handleLogout = () => {
    logout()
    router.replace("/signin")
  }

  const hasData = overview.data?.has_data ?? false
  const firstLoad = overview.loading && !overview.data
  const suggestions = (sidebarTop.data?.items ?? []).map(({ id, name, sku }) => ({ id, name, sku }))
  const loadError = overview.error ?? summary.error ?? timeline.error

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar
        selectedId={selectedId}
        onSelect={setSelected}
        topProducts={sidebarTop.data?.items ?? []}
        totalProducts={overview.data?.product_count ?? 0}
        loading={sidebarTop.loading}
        onOpenSearch={() => setSearchOpen(true)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-card/60 px-6 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="mr-2 inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-secondary md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>

            <h1 className="truncate text-lg font-semibold tracking-tight">
              {selected?.name ?? "Overview"}
            </h1>
            {selected?.sku && (
              <span className="hidden rounded-md bg-secondary px-2 py-0.5 font-mono text-xs text-secondary-foreground sm:inline">
                {selected.sku}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <CommandSearch
              open={searchOpen}
              onOpenChange={setSearchOpen}
              onSelect={setSelected}
              suggestions={suggestions}
            />
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

        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Demand Forecasting
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-balance">
                  {selected ? selected.name : "Executive Overview"}
                </h2>
              </div>
              {hasData && <RunForecastButton onDone={refresh} />}
            </div>

            {loadError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>Could not load dashboard data: {loadError.message}</span>
              </div>
            )}

            {firstLoad ? (
              <div className="h-64 animate-pulse rounded-xl border border-border bg-card" />
            ) : !hasData ? (
              <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-10 text-center">
                <h3 className="text-base font-semibold">No sales data yet</h3>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  Import a CSV with daily sales (date, product, units, revenue) to see trends and
                  forecasts for your products.
                </p>
              </div>
            ) : (
              <>
                <KpiCards summary={summary.data} forecast={timeline.data?.forecast ?? null} isOverview={!selected} />
                <TimelineChart timeline={timeline.data} avgUnitPrice={summary.data?.avg_unit_price ?? null} />
                {!selected && (
                  <ForecastAnalyticsGrid
                    topProducts={shareTop.data}
                    forecasts={forecasts.data}
                    shareWeeks={SHARE_WEEKS}
                  />
                )}
                <ProductContextPanel summary={summary.data} product={selected} />
              </>
            )}

            {!firstLoad && <CsvUploadCard onImported={refresh} hasExistingData={hasData} />}
            {hasData && <ForecastTable forecasts={forecasts.data} />}
          </div>
        </main>
      </div>
    </div>
  )
}
