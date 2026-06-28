"use client"

import { useRouter } from "next/navigation"
import { useEffect, type ReactNode } from "react"
import { useAuth } from "@/lib/auth/auth-context"
import { useBusinessContext } from "@/lib/context/business-context"

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div
        className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary"
        role="status"
        aria-label="Loading"
      />
    </div>
  )
}

/** Renders children only for authenticated users; otherwise redirects to /signin. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { ready, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (ready && !isAuthenticated) {
      router.replace("/signin")
    }
  }, [ready, isAuthenticated, router])

  if (!ready || !isAuthenticated) {
    return <FullScreenLoader />
  }

  return <>{children}</>
}

/**
 * Requires the user to have an active business.
 * Redirects to /onboarding if authenticated but no business is selected.
 * Must be nested inside RequireAuth so isAuthenticated is guaranteed true.
 */
export function RequireBusiness({ children }: { children: ReactNode }) {
  const { hasBusiness, loadingBusiness } = useBusinessContext()
  const router = useRouter()

  useEffect(() => {
    if (!loadingBusiness && !hasBusiness) {
      router.replace("/onboarding")
    }
  }, [loadingBusiness, hasBusiness, router])

  if (loadingBusiness || !hasBusiness) return <FullScreenLoader />

  return <>{children}</>
}

/** Redirects already-authenticated users away from public-only pages (e.g. login). */
export function RedirectIfAuthenticated({
  children,
  to = "/dashboard",
}: {
  children: ReactNode
  to?: string
}) {
  const { ready, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (ready && isAuthenticated) {
      router.replace(to)
    }
  }, [ready, isAuthenticated, router, to])

  if (ready && isAuthenticated) {
    return <FullScreenLoader />
  }

  return <>{children}</>
}
