export type ProductRef = {
  id: number
  name: string
  sku: string | null
}

// ── GET /api/analytics/summary/?product_id= ──────────────────────────────────

export type SalesSummary = {
  has_data: boolean
  product_count: number
  total_units: number
  total_revenue: number
  date_from: string | null
  date_to: string | null
  last_week_units: number
  previous_week_units: number
  avg_unit_price: number | null
}

// ── GET /api/analytics/timeline/?product_id=&weeks= ──────────────────────────

export type TimelineWeek = {
  week_start: string
  units: number
  revenue: number
}

export type ForecastPoint = {
  week_start: string
  predicted: number
  lower: number | null
  upper: number | null
  confidence: number
}

export type SalesTimeline = {
  weeks: TimelineWeek[]
  forecast: ForecastPoint | null
}

// ── GET /api/analytics/top-products/?limit=&weeks=&order_by= ─────────────────

export type TopProductsOrder = "units" | "revenue"

export type TopProduct = ProductRef & {
  units: number
  revenue: number
}

export type TopProducts = {
  items: TopProduct[]
  other: {
    units: number
    revenue: number
    product_count: number
  }
  total_units: number
  total_revenue: number
}

// ── POST /api/sales/imports/  and  GET /api/sales/imports/{id}/ ──────────────

export type ImportStatus = "pending" | "running" | "done" | "failed"

export type ImportJob = {
  id: number
  status: ImportStatus
  file_name: string
  rows_processed: number
  rows_written: number
  rows_skipped: number
  products_created: number
  row_errors: string[]
  error: string | null
  created_at: string
  finished_at: string | null
}

// ── GET /api/forecasting/results/?product_id=  (existing endpoint) ───────────

export type ForecastResult = {
  id: number
  product: number
  product_name?: string
  product_sku?: string | null
  product_price?: string | null
  predicted_quantity: number
  lower_bound: number | null
  upper_bound: number | null
  horizon: number
  horizon_display: string
  confidence_score: string
  generated_at: string
  target_date: string
}

// ── POST /api/forecasting/results/run/ ───────────────────────────────────────

export type RunForecastResponse = {
  forecasts_created: number
}
