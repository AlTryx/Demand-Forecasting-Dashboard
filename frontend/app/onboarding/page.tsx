import { TrendingUp } from "lucide-react"
import { RequireAuth } from "@/components/auth/route-guard"
import { BusinessSelect } from "@/components/onboarding/business-select"

export const metadata = { title: "Select Workspace — Forecasting.AI" }

export default function OnboardingPage() {
  return (
    <RequireAuth>
      <main className="flex min-h-screen items-start justify-center bg-background px-4 pt-24 pb-12">
        <div className="w-full max-w-md space-y-8">
          {/* Brand mark */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <TrendingUp className="size-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Choose your workspace
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Select an existing business or create a new one to continue.
              </p>
            </div>
          </div>

          <BusinessSelect />
        </div>
      </main>
    </RequireAuth>
  )
}
