"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { getMyBusiness } from "@/lib/api/business-service"
import { getAccessToken } from "@/lib/auth/tokens"
import { useAuth } from "@/lib/auth/auth-context"
import type { BusinessMe } from "@/lib/types/business"

type BusinessContextValue = {
  activeBusiness: BusinessMe | null
  loadingBusiness: boolean
  hasBusiness: boolean
  refreshBusiness: () => void
}

const BusinessContext = createContext<BusinessContextValue | null>(null)

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [activeBusiness, setActiveBusiness] = useState<BusinessMe | null>(null)
  const [loadingBusiness, setLoadingBusiness] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!isAuthenticated) {
      setActiveBusiness(null)
      return
    }
    const token = getAccessToken()
    if (!token) return

    let active = true
    setLoadingBusiness(true)

    getMyBusiness(token)
      .then((biz) => { if (active) setActiveBusiness(biz) })
      .catch(() => { if (active) setActiveBusiness(null) })
      .finally(() => { if (active) setLoadingBusiness(false) })

    return () => { active = false }
  }, [isAuthenticated, version])

  const refreshBusiness = useCallback(() => setVersion((v) => v + 1), [])

  const value = useMemo<BusinessContextValue>(
    () => ({
      activeBusiness,
      loadingBusiness,
      hasBusiness: activeBusiness !== null,
      refreshBusiness,
    }),
    [activeBusiness, loadingBusiness, refreshBusiness],
  )

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>
}

export function useBusinessContext(): BusinessContextValue {
  const ctx = useContext(BusinessContext)
  if (!ctx) throw new Error("useBusinessContext must be used within BusinessProvider")
  return ctx
}
