"use client"

import { useCallback, useEffect, useState } from "react"
import { getAccessToken } from "@/lib/auth/tokens"

export type ApiState<T> = {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Generic data-fetching hook. Pass a stable `useCallback`-wrapped fetcher
 * from your domain hook — the effect re-runs whenever the fetcher reference
 * changes, so page/filter changes propagate automatically.
 */
export function useApiData<T>(fetcher: (token: string) => Promise<T>): ApiState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true
    const token = getAccessToken()

    if (!token) {
      setData(null)
      setLoading(false)
      setError(new Error("Not authenticated"))
      return
    }

    setLoading(true)
    setError(null)

    fetcher(token)
      .then((result) => {
        if (active) {
          setData(result)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err : new Error("Unknown error"))
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [fetcher, version])

  const refetch = useCallback(() => setVersion((v) => v + 1), [])

  return { data, loading, error, refetch }
}
