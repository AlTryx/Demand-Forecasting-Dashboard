"use client"

import { useCallback } from "react"
import { getMyBusiness } from "@/lib/api/business-service"
import { useApiData } from "./use-api-data"
import type { BusinessMe } from "@/lib/types/business"

export function useBusiness() {
  const fetcher = useCallback((token: string) => getMyBusiness(token), [])
  return useApiData<BusinessMe>(fetcher)
}
