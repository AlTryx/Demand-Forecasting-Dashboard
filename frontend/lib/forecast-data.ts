export type Product = {
  id: string
  label: string
  sku: string
  accuracy: number
  activePredictions: number
}

export type TimelinePoint = {
  weekOf: string
  label: string
  actual: number | null
  predicted: number | null
  lower: number | null
  upper: number | null
  isForecast: boolean
}

export type ForecastLog = {
  targetDate: string
  predictedVolume: number
  unit: string
  modelId: string
  productId: string
  productName: string
  pricePerUnit: number
}

export type DemandShare = {
  productId: string
  label: string
  volume: number
}

export type VolatilityItem = {
  productId: string
  label: string
  sku: string
  confidenceScore: number
}

export type ProductContext = {
  label: string
  sku: string
  leadTimeDays: number
  storageVelocity: "High" | "Medium" | "Low"
  safetyStock: number
  generatedAt: string
}

export const products: Product[] = [
  {
    id: "overview",
    label: "Overview",
    sku: "ALL-SKUS",
    accuracy: 94.7,
    activePredictions: 1284,
  },
  {
    id: "product-61",
    label: "Product 61",
    sku: "SKU-00061",
    accuracy: 96.2,
    activePredictions: 312,
  },
  {
    id: "product-62",
    label: "Product 62",
    sku: "SKU-00062",
    accuracy: 91.8,
    activePredictions: 268,
  },
  {
    id: "product-63",
    label: "Product 63",
    sku: "SKU-00063",
    accuracy: 93.4,
    activePredictions: 204,
  },
  {
    id: "product-64",
    label: "Product 64",
    sku: "SKU-00064",
    accuracy: 95.1,
    activePredictions: 196,
  },
]

// Four trailing weeks of actuals + one forward forecast week.
// "Today" is 2026-06-14, so the next ISO week begins 2026-06-15.
const weekBuckets = [
  { weekOf: "2026-05-18", label: "May 18", forecast: false },
  { weekOf: "2026-05-25", label: "May 25", forecast: false },
  { weekOf: "2026-06-01", label: "Jun 1", forecast: false },
  { weekOf: "2026-06-08", label: "Jun 8", forecast: false },
  { weekOf: "2026-06-15", label: "Next Week", forecast: true },
]

function seededWeeklyVolume(seed: number, index: number) {
  // Deterministic weekly totals so server and client render identically.
  const wave = Math.sin((index + seed) * 0.8) * 0.5 + Math.cos(index * 0.55) * 0.3
  return Math.round(8600 + seed * 620 + wave * 2600 + index * 260)
}

export function getTimeline(productId: string): TimelinePoint[] {
  const seed = Math.max(1, products.findIndex((p) => p.id === productId)) + 2
  const points: TimelinePoint[] = weekBuckets.map((w, i) => {
    const value = seededWeeklyVolume(seed, i)
    if (w.forecast) {
      const band = Math.round(value * 0.08)
      return {
        weekOf: w.weekOf,
        label: w.label,
        actual: null,
        predicted: value,
        lower: value - band,
        upper: value + band,
        isForecast: true,
      }
    }
    return {
      weekOf: w.weekOf,
      label: w.label,
      actual: value,
      predicted: null,
      lower: null,
      upper: null,
      isForecast: false,
    }
  })
  // Anchor the forecast line + band to the last actual so the segment connects.
  const lastActual = points[points.length - 2]
  lastActual.predicted = lastActual.actual
  lastActual.lower = lastActual.actual
  lastActual.upper = lastActual.actual
  return points
}

// The single forward prediction (next week) for a product.
export function getForecastPoint(productId: string): TimelinePoint {
  const timeline = getTimeline(productId)
  return timeline[timeline.length - 1]
}

const productNodes = products.filter((p) => p.id !== "overview")

// Next week's total forecast volume per product (deterministic).
export function getDemandShare(): DemandShare[] {
  return productNodes.map((p) => {
    const volume = getForecastPoint(p.id).predicted ?? 0
    return { productId: p.id, label: p.label, volume }
  })
}

// Confidence scores derived from accuracy; lower scores surface as alert rows.
export function getVolatility(): VolatilityItem[] {
  return productNodes
    .map((p, i) => ({
      productId: p.id,
      label: p.label,
      sku: p.sku,
      // Deterministic float in the 0–1 range, anchored on model accuracy.
      confidenceScore: Number((p.accuracy / 100 - (0.18 + i * 0.05)).toFixed(2)),
    }))
    .sort((a, b) => a.confidenceScore - b.confidenceScore)
}

export function getProductContext(productId: string): ProductContext {
  const product = products.find((p) => p.id === productId) ?? products[0]
  const seed = Math.max(1, products.findIndex((p) => p.id === productId)) + 2
  const forecast = getForecastPoint(productId)
  const peak = forecast.upper ?? forecast.predicted ?? 0
  const velocities: ProductContext["storageVelocity"][] = ["High", "Medium", "Low"]
  return {
    label: product.label,
    sku: product.sku,
    leadTimeDays: 7 + seed * 2,
    storageVelocity: velocities[seed % velocities.length],
    // Safety stock buffer: peak upper bound scaled by a service-level factor.
    safetyStock: Math.round(peak * 0.15),
    generatedAt: "2026-06-14T08:42:00Z",
  }
}

export function getForecastLog(productId: string): ForecastLog[] {
  const timeline = getTimeline(productId)
  const product = products.find((p) => p.id === productId) ?? products[0]
  const modelTag =
    productId === "overview"
      ? "ENSEMBLE"
      : `P${productId.replace("product-", "")}`
  // Newest week first; volume is the actual for historical weeks, the
  // model prediction for the forward week.
  return timeline
    .map((point, i) => {
      // Deterministic price based on product: 5-25 EUR per unit
      const pricePerUnit = 5 + (products.findIndex((p) => p.id === productId) % 5) * 5
      return {
        targetDate: point.weekOf,
        predictedVolume: point.isForecast
          ? point.predicted ?? 0
          : point.actual ?? 0,
        unit: "units / wk",
        modelId: `MDL-${modelTag}-v2.${4 - (i % 3)}`,
        productId,
        productName: product.label,
        pricePerUnit,
      }
    })
    .reverse()
}

// Helper to format value as EUR currency.
// Use a European locale (de-DE) so the euro sign and grouping render correctly
// (e.g. "1.234 €") instead of the en-US "€1,234" form.
export function formatCurrencyEUR(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// Helper to format numbers with locale
export function formatNumber(
  value: number,
  locale: "bg-BG" | "en-US" = "en-US"
): string {
  return new Intl.NumberFormat(locale).format(value)
}

// Get aggregate metrics for overview
export function getAggregateMetrics() {
  const allForecasts = productNodes.map((p) => getForecastPoint(p.id))

  // Calculate stockouts at risk (products with forecast below safety stock)
  const stockoutsAtRisk = productNodes.filter((p) => {
    const context = getProductContext(p.id)
    const forecast = getForecastPoint(p.id).predicted ?? 0
    return forecast < context.safetyStock
  }).length

  // Calculate total capital required (sum of all forecasted volumes * price)
  const totalCapital = productNodes.reduce((sum, p) => {
    const forecast = getForecastPoint(p.id).predicted ?? 0
    const idx = products.findIndex((prod) => prod.id === p.id)
    const price = 5 + (idx % 5) * 5
    return sum + forecast * price
  }, 0)

  return { stockoutsAtRisk, totalCapital }
}
